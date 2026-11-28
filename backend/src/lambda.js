import serverlessExpress from '@codegenie/serverless-express';
import { app } from './server.js';
import sequelize from './config/database.js';
import { seedInitialData } from './utils/seeder.js';

let serverlessExpressInstance = null;
let isInitialized = false;

async function setupLambda(event, context) {
  if (!isInitialized) {
    try {
      await sequelize.authenticate();
      await sequelize.sync({ alter: true });
      await seedInitialData();
      isInitialized = true;
      console.log('✓ AWS Lambda initialized with database connection');
    } catch (err) {
      console.error('Lambda DB init error:', err);
    }
  }
  serverlessExpressInstance = serverlessExpress({ app });
  return serverlessExpressInstance(event, context);
}

export const handler = async (event, context) => {
  if (serverlessExpressInstance) {
    return serverlessExpressInstance(event, context);
  }
  return setupLambda(event, context);
};
