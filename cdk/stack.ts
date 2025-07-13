import { Duration, Stack, StackProps } from "aws-cdk-lib";
import * as path from "path";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as dotenv from "dotenv";
dotenv.config();

export class SignaBotAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const myLambda = new NodejsFunction(this, "SignaBotFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../src/signalbot/index.ts"),
      handler: "index.handler",
      environment: {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || "", 
        BYBIT_API_KEY: process.env.BYBIT_API_KEY || "", 
        BYBIT_API_SECRET: process.env.BYBIT_API_SECRET || "", 
        EMAIL: process.env.EMAIL || "", 
        EMAIL_PASS: process.env.EMAIL_PASS || "", 
      },
      timeout: Duration.seconds(15),
    });

    const api = new apigateway.RestApi(this, "SignalBotApi", {
      restApiName: "Signal Bot API",
      description: "Signal Bot API example.",
    });

    const userResource = api.root.addResource("notification");

    userResource.addMethod("POST", new apigateway.LambdaIntegration(myLambda), {
      apiKeyRequired: false,
    });

    // Enable CORS
    api.root.addCorsPreflight({
      allowOrigins: ["*"],
      allowMethods: ["GET", "POST", "OPTIONS"],
    });
  }
}
