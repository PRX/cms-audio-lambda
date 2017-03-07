'use strict';
const dotenv = require('dotenv');
const lambda = require('node-lambda');

// environment name
let envName = process.argv[2];
if (['development', 'staging', 'production'].indexOf(envName) < 0) {
  console.error('Usage: deploy.js [development|staging|production]');
  process.exit(1);
}

// HACKY: don't try to reconfigure the function - just upload the new code
let oldParams = lambda._params;
lambda._params = function(program, buffer) {
  let params = oldParams.call(this, program, buffer);
  return {FunctionName: params.FunctionName, Code: params.Code, Environment: params.Environment};
};

// minimum config needed to deploy
lambda.deploy({
  environment: envName,
  configFile: `config/${envName}.env`,
  region: process.env.AWS_REGION || 'us-east-1',
  functionName: process.env.AWS_FUNCTION_NAME || 'cms-image-lambda',
  excludeGlobs: '.env env-example test'
});
