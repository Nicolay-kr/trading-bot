# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

### To connect to you aws account use

`aws configure`

### To check credentions

`aws configure list`

```
AWS Access Key ID: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYzEXAMPLEKEY
Default region name: us-east-1
Default output format: json
```

## Deploying Your CDK Application
Build Your Project: Before deploying, you need to compile your TypeScript code into JavaScript.

```
npm run build
```

Bootstrap CDK: The first time you use CDK in a new environment, you need to bootstrap the CDK. This command sets up the necessary environment in AWS (such as default S3 buckets, IAM roles, etc.) for CDK to work:

```
cdk bootstrap
```

Deploy the CDK Stack: Once the environment is set up, you can deploy your stack. Use the following command from the root directory of your CDK project:

```
cdk deploy
```

CDK will package your application, create the necessary resources in AWS (like Lambda functions, S3 buckets, API Gateway, etc.), and deploy them.

To remove all resources created by the CDK, use:

```
cdk destroy <stack-name>
```
  <!-- body: 'JIFU Connect:\n' +
      'Premium Crypto Ideas\n' +
      'Daniel Lopez: Sol/Usd\n' +
      'Bullish idea \n' +
      'Potential zone 150.5-149.50\n' +
      'Potential inv 147.0\n' +
      'Potential exits  152.50/ 154.50 /156.50\n', -->