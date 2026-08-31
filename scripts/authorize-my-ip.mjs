import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { EC2Client, AuthorizeSecurityGroupIngressCommand } from "@aws-sdk/client-ec2";

async function loadLocalEnvironment() {
  try {
    const contents = await readFile(resolve(".env.local"), "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[match[1]] = value;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

await loadLocalEnvironment();

const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ROOT_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_ROOT_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION || "ap-southeast-1";

// Get current public IP
const ipRes = await fetch("https://checkip.amazonaws.com");
const publicIp = (await ipRes.text()).trim();
console.log("Current Public IP:", publicIp);

const ec2 = new EC2Client({ region, credentials: { accessKeyId, secretAccessKey } });

try {
  await ec2.send(new AuthorizeSecurityGroupIngressCommand({
    GroupId: "sg-010a5308e8b8b2a30",
    IpPermissions: [
      {
        IpProtocol: "tcp",
        FromPort: 5432,
        ToPort: 5432,
        IpRanges: [
          {
            CidrIp: `${publicIp}/32`,
            Description: "Local Development IP for Promach DSR",
          },
        ],
      },
    ],
  }));
  console.log(`Successfully added ingress rule for ${publicIp}/32 on port 5432!`);
} catch (err) {
  if (err.name === "InvalidPermission.Duplicate") {
    console.log("IP rule already exists.");
  } else {
    console.error("Error authorizing security group ingress:", err);
  }
}
