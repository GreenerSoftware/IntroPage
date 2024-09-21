import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  githubActions,
  WebFrontend,
} from '@scloud/cdk-patterns';
import { HostedZone, IHostedZone } from 'aws-cdk-lib/aws-route53';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';

// Credentials
// PERSONAL_ACCESS_TOKEN - create a Github personal access token (classic) with 'repo' scope and set this in .infrastructure/secrets/github.sh using export PERSONAL_ACCESS_TOKEN=ghp_...
// AWS_PROFILE           - if you've set up a profile to access this account, set this in .infrastructure/secrets/aws.sh using export AWS_PROFILE=...

// Route 53
const DOMAIN_NAME = 'greenersoftware.net';
const ZONE_ID = 'Z090260119RJ9I6RT1BLQ';

// Github - set in secrets/github.sh
// const OWNER = 'GreenerSoftware';
// const REPO = 'IntroPage';

function env(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`No environment variable value for ${key}`);
  return value;
}

export default class IntropageStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // You'll need a zone to create DNS records in. This will need to be referenced by a real domain name so that SSL certificate creation can be authorised.
    // NB the DOMAIN_NAME environment variable is defined in .infrastructure/secrets/domain.sh
    const zone = this.zone(DOMAIN_NAME, ZONE_ID);

    // Bucket to back up infrastructure build inputs/outputs
    // This is useful for backup and for sharing build inputs between developers, but is commentsed out by default
    // So you son't upload anything to s3 without explicity deciding this is something that's useful for you.
    // The imports this needs are also commented out by default and you'll need PrivateBucket added to the @scloud/cdk-patterns import.
    // new BucketDeployment(this, 'secretsDeployment', {
    //   destinationBucket: PrivateBucket.expendable(this, 'secrets'),
    //   sources: [Source.asset(path.join(__dirname, '../secrets'))],
    // });

    // Cloudfront function association:
    const defaultBehavior: Partial<cloudfront.BehaviorOptions> = {
      functionAssociations: [{
        function: new cloudfront.Function(this, 'staticURLs', {
          code: cloudfront.FunctionCode.fromFile({ filePath: './lib/cfFunction.js' }),
          comment: 'Rewrite static URLs to .html so they get forwarded to s3',
        }),
        eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
      }],
    };

    // Create the web frontend using Cloudfront
    // The following calls will create variables in Github Actions that can be used to deploy the frontend and API:
    // * API_LAMBDA - the name of the Lambda function to update when deploying the API
    // * CLOUDFRONT_BUCKET - for uploading the frontend
    // * CLOUDFRONT_DISTRIBUTIONID - for invalidating the Cloudfront cache
    new WebFrontend(this, 'cloudfront', {
      zone,
      domainName: DOMAIN_NAME,
      defaultIndex: true,
      redirectWww: true,
      distributionProps: {
        defaultBehavior: defaultBehavior as cloudfront.BehaviorOptions,
      },
    });

    // Set up OIDC access from Github Actions - this enables builds to deploy updates to the infrastructure
    githubActions(this).ghaOidcRole({ owner: env('OWNER'), repo: env('REPO') });
  }

  /**
   * NB: creating a hosted zone is not free. You will be charged $0.50 per month for each hosted zone.
   * @param zoneName The name of the hosted zone - this is assumed to be the same as the domain name and will be used by other constructs (e.g. for SSL certificates),
   * @param zoneId Optional. The ID of an existing hosted zone. If you already have a hosted zone, you can pass the zoneId to this function to get a reference to it, rather than creating a new one.
   */
  zone(zoneName: string, zoneId?: string): IHostedZone {
    if (zoneId) {
      return HostedZone.fromHostedZoneAttributes(this, 'zone', {
        hostedZoneId: zoneId,
        zoneName,
      });
    }

    // Fall back to creating a new HostedZone - costs $0.50 per month
    return new HostedZone(this, 'zone', {
      zoneName,
    });
  }
}
