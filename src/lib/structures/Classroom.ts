/* eslint-disable @typescript-eslint/unbound-method */
import type { OAuth2Client, Credentials } from 'google-auth-library';
import type { TextChannel, Message } from 'discord.js';
import type { Nullish } from '@sapphire/utilities';
import type Reminder from '#entities/Reminder';
import type Courses from '#types/Courses';
import { google, classroom_v1 as ClassroomAPI } from 'googleapis';
import { MessageEmbed } from 'discord.js';
import { container } from '@sapphire/framework';
import { cutText } from '@sapphire/utilities';
import prompt from 'prompts';
import fs from 'fs/promises';

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = process.env;
const scope = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.announcements.readonly',
  'https://www.googleapis.com/auth/classroom.course-work.readonly',
];

const raw = await fs.readFile('./data/courses.json', 'utf8');
const mhsCourses: Courses = JSON.parse(raw);

type Post = ClassroomAPI.Schema$Announcement | ClassroomAPI.Schema$CourseWork;

class Classroom {
  private classroom: ClassroomAPI.Classroom;
  private client: OAuth2Client;
  private courses: ClassroomAPI.Schema$Course[];
  private lastAnnouncement?: number; // index
  private lastCourseWork?: number; // index

  public constructor() {
    this.client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    this.classroom = google.classroom({ version: 'v1', auth: this.client });
    this.courses = [];
  }

  public async listUpdates() {
    const { newAnnouncements, newCourseWork } = await this.checkNewPosts();
    const classroomChannel = container.client.guild.channels.cache.get(
      process.env.CLASSROOM_CHANNEL
    ) as TextChannel;

    for (const courseWork of newCourseWork) {
      const options = this.createEmbed(courseWork, true);
      const message = await classroomChannel.send(options);

      const reminder = container.reminders.create({
        _id: message.id,
        courseId: courseWork.courseId,
        courseWorkId: courseWork.id,
      });

      const success = await this.startTimers(reminder, { courseWork, message });
      if (success) {
        await container.reminders.persist(reminder).flush();
      }
    }

    for (const announcement of newAnnouncements) {
      const options = this.createEmbed(announcement, false);
      await classroomChannel.send(options);
    }
  }

  public async startTimers(
    reminder: Reminder,
    overrides?: {
      courseWork: ClassroomAPI.Schema$CourseWork;
      message: Message;
    }
  ) {
    const course = this.getCourseById(reminder.courseId);
    if (!course) {
      return false;
    }

    const courseWork =
      overrides?.courseWork ??
      (await this.classroom.courses.courseWork
        .get({ courseId: reminder.courseId, id: reminder.courseWorkId })
        .then((res) => res.data)
        .catch(() => null));

    if (!courseWork) {
      return false;
    }

    const dueDate = Classroom.resolveDueDate(courseWork);
    if (!dueDate || dueDate < Date.now()) {
      return false;
    }

    const classroomChannel = container.client.guild.channels.cache.get(
      process.env.CLASSROOM_CHANNEL
    ) as TextChannel;

    const message =
      overrides?.message ?? (await classroomChannel.messages.fetch(reminder._id).catch(() => null));

    if (!message) {
      return false;
    }

    const mention = Classroom.resolveMention(course.alternateLink!);
    if (dueDate - Date.now() > 8.64e7) {
      setTimeout(() => {
        const embed = new MessageEmbed()
          .setColor(process.env.COLOR)
          .setTitle('Reminder!')
          .setDescription('This work is due in 24 hours!');

        void message.reply({ content: mention, embeds: [embed] }).catch(() => null);
      }, dueDate - Date.now() - 8.64e7).unref();
    }

    if (dueDate - Date.now() > 3.6e6) {
      setTimeout(() => {
        const embed = new MessageEmbed()
          .setColor(process.env.COLOR)
          .setTitle('Reminder!')
          .setDescription('This work is due in 1 hour!');

        void message.reply({ content: mention, embeds: [embed] }).catch(() => null);
      }, dueDate - Date.now() - 3.6e6).unref();
    }

    setTimeout(() => {
      void container.reminders.removeAndFlush(reminder);
    }, dueDate - Date.now()).unref();

    return true;
  }

  public async authorize() {
    const authToken = await this.getAuthToken();
    this.client.setCredentials(authToken);
    const { token } = await this.client.getAccessToken();
    await this.verifyAndUpdateToken(token);
  }

  public async setCourses() {
    const {
      data: { courses = [] },
    } = await this.classroom.courses.list();

    this.courses = courses.filter((course) =>
      mhsCourses.some(({ linkId }) => course.alternateLink?.endsWith(linkId))
    );
  }

  private createEmbed(entry: Post, isCourseWork: boolean) {
    const typeguard = (_entry: Post): _entry is ClassroomAPI.Schema$CourseWork => isCourseWork;
    const course = this.getCourseById(entry.courseId!)!;

    const header = `New ${isCourseWork ? 'classwork' : 'post'} in "${course.name}"`;
    const embed = new MessageEmbed()
      .setColor(process.env.COLOR)
      .setTitle(header)
      .setURL(entry.alternateLink!)
      .setDescription(
        cutText(
          typeguard(entry)
            ? entry.description ?? 'No instructions provided!'
            : entry.text ?? 'This post has no text!',
          2000
        )
      );

    if (typeguard(entry) && entry.title) {
      embed.setAuthor(header).setTitle(entry.title);
    }

    if (typeguard(entry)) {
      if (entry.dueDate) {
        const dueDate = Classroom.resolveDueDate(entry);
        if (dueDate) {
          embed.addField(`❯ Assignment Due Date`, `<t:${Math.floor(dueDate / 1000)}:R>`);
        }
      }

      if (entry.workType && entry.workType !== 'ASSIGNMENT') {
        const worktypes: Record<string, string> = {
          SHORT_ANSWER_QUESTION: 'Short Answer Question',
          MULTIPLE_CHOICE_QUESTION: 'Multiple Choice Question',
        };

        embed.addField(`❯ Work Type`, worktypes[entry.workType] ?? 'Unknown');

        if (entry.workType === 'MULTIPLE_CHOICE_QUESTION') {
          embed.addField(
            `❯ Choices`,
            entry
              .multipleChoiceQuestion!.choices!.map((choice, idx) => `\`${idx}\` - ${choice}`)
              .join('\n')
          );
        }
      }
    }

    if (entry.materials) {
      const files: string[] = [];
      const youtube: string[] = [];
      const links: string[] = [];
      const forms: string[] = [];

      entry.materials.forEach(({ driveFile, youtubeVideo, link, form }) => {
        if (driveFile) {
          const file = driveFile.driveFile;
          if (file) {
            files.push(`[${file.title}](${file.alternateLink})`);
          }
        }

        if (youtubeVideo) {
          youtube.push(`[${youtubeVideo.title}](${youtubeVideo.alternateLink})`);
        }

        if (link) {
          links.push(`[${link.title}](${link.url})`);
        }

        if (form) {
          forms.push(`[${form.title}](${form.formUrl})`);
        }
      });

      if (files.length) {
        embed.addField('❯ Attached Files', files.join(', '), true);
      }

      if (youtube.length) {
        embed.addField('❯ Attached Videos', youtube.join(', '), true);
      }

      if (links.length) {
        embed.addField('❯ Attached Links', links.join(', '), true);
      }

      if (forms.length) {
        embed.addField('❯ Attached Forms', forms.join(', '), true);
      }
    }

    const mention = Classroom.resolveMention(course.alternateLink!);
    return { content: mention, embeds: [embed] };
  }

  private async listAnnouncements() {
    const allAnnouncements: ClassroomAPI.Schema$Announcement[] = [];
    for (const course of this.courses) {
      const {
        data: { announcements },
      } = await this.classroom.courses.announcements.list({
        courseId: course.id as string,
      });

      if (announcements) {
        allAnnouncements.push(...announcements.filter(Classroom.filterPosts));
      }
    }

    return allAnnouncements.sort(Classroom.sortPosts);
  }

  private async listCourseWork() {
    const allCourseWork: ClassroomAPI.Schema$CourseWork[] = [];
    for (const course of this.courses) {
      const {
        data: { courseWork },
      } = await this.classroom.courses.courseWork.list({
        courseId: course.id as string,
      });

      if (courseWork) {
        allCourseWork.push(...courseWork.filter(Classroom.filterPosts));
      }
    }

    return allCourseWork.sort(Classroom.sortPosts);
  }

  private getCourseById(id: string) {
    return this.courses.find((c) => c.id === id);
  }

  private async checkNewPosts() {
    const announcements = await this.listAnnouncements();
    const courseWork = await this.listCourseWork();

    const newAnnouncements = this.lastAnnouncement
      ? announcements.slice(0, -this.lastAnnouncement)
      : announcements.filter((a) => Date.now() - Date.parse(a.creationTime!) < 60000);

    const newCourseWork = this.lastCourseWork
      ? courseWork.slice(0, -this.lastCourseWork)
      : courseWork.filter((c) => Date.now() - Date.parse(c.creationTime!) < 60000);

    this.lastAnnouncement = announcements.length;
    this.lastCourseWork = courseWork.length;

    return { newAnnouncements, newCourseWork };
  }

  private async createAuthToken() {
    const authUrl = this.client.generateAuthUrl({
      access_type: 'offline',
      scope,
    });

    console.log(`Open this URL to authorize the application: ${authUrl}`);

    const { code } = await prompt({
      name: 'code',
      type: 'text',
      message: 'What code did you receive?',
    });

    const { tokens } = await this.client.getToken(code);
    const raw = await fs.readFile('./data/tokens.json', 'utf8').catch(() => null);
    if (raw && !tokens.refresh_token) {
      const json: Credentials = JSON.parse(raw);
      tokens.refresh_token = json.refresh_token;
    }

    await fs.writeFile('./data/tokens.json', JSON.stringify(tokens, undefined, 2));
    return tokens;
  }

  private getAuthToken() {
    return fs
      .readFile('./data/tokens.json', 'utf8')
      .then(JSON.parse)
      .catch(() => this.createAuthToken());
  }

  private async verifyAndUpdateToken(token: string | Nullish) {
    const raw = await fs.readFile('./data/tokens.json', 'utf8');
    const json: Credentials = JSON.parse(raw);

    if (token !== json.access_token) {
      json.access_token = token;
      await fs.writeFile('./data/tokens.json', JSON.stringify(json, undefined, 2));
    }
  }

  private static resolveMention(code: string) {
    const { roleId } = mhsCourses.find(({ linkId }) => code.endsWith(linkId))!;
    return `<@&${roleId}>`;
  }

  private static resolveDueDate(courseWork: ClassroomAPI.Schema$CourseWork) {
    if (!courseWork.dueDate?.day) {
      return;
    }

    const now = new Date();
    const { year = now.getUTCFullYear(), month = now.getUTCMonth() + 1, day } = courseWork.dueDate;
    const { hours = 0, minutes = 0, seconds = 0 } = courseWork.dueTime!;

    return Date.UTC(year!, month! - 1, day, hours!, minutes!, seconds!);
  }

  private static filterPosts(post: Post) {
    return post.creationTime && (!post.assigneeMode || post.assigneeMode === 'ALL_STUDENTS');
  }

  private static sortPosts(a: Post, b: Post) {
    return Date.parse(a.creationTime!) - Date.parse(b.creationTime!);
  }
}

export default Classroom;
