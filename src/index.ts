import '#root/setup';
import { container } from '@sapphire/framework';
import { MikroORM } from '@mikro-orm/core';
import { yellow, green, bold } from 'colorette';
import Client from '#structures/Client';
import Classroom from '#structures/Classroom';
import Cancelation from '#entities/Cancelation';
import Reminder from '#entities/Reminder';
import User from '#entities/User';
import ormOptions from '#config/orm';

const client = new Client();

try {
  client.logger.info(yellow('Connecting to database'));
  const { em } = await MikroORM.init(ormOptions);
  client.logger.info(bold(green('Connected')));

  container.em = em;
  container.users = em.getRepository(User);
  container.reminders = em.getRepository(Reminder);
  container.cancelations = em.getRepository(Cancelation);

  client.logger.info(yellow('Connecting to classroom'));
  const classroom = new Classroom();
  await classroom.authorize();
  await classroom.setCourses();
  client.logger.info(bold(green('Connected')));

  container.classroom = classroom;

  client.logger.info(yellow('Logging in'));
  await client.login(process.env.TOKEN);
  client.logger.info(bold(green('Logged in')));
} catch (error) {
  client.logger.fatal(error);
  client.destroy();
  process.exit(1);
}
