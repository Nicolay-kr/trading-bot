import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

export class MyCdkAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const myLambda = new lambda.Function(this, "MyLambdaFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("lambda"),
      handler: "index.handler",
    });

    const api = new apigateway.RestApi(this, "MyCustomApi", {
      restApiName: "My Service API",
      description: "Custom API Gateway example.",
    });

    // Add routes, CORS, and other customizations
    const helloResource = api.root.addResource("hello");
    helloResource.addMethod("GET", new apigateway.LambdaIntegration(myLambda));

    const userResource = api.root.addResource("notification");
    userResource.addMethod("POST", new apigateway.LambdaIntegration(myLambda));

    // Enable CORS
    api.root.addCorsPreflight({
      allowOrigins: ["*"],
      allowMethods: ["GET", "POST", "OPTIONS"],
    });
  }
}
