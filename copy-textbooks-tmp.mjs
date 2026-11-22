import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const SRC = new S3Client({
  endpoint: process.env.SRC_ENDPOINT ?? "http://127.0.0.1:19100",
  region: "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.SRC_KEY ?? "paic2admin",
    secretAccessKey:
      process.env.SRC_SECRET ??
      "a7ee52abeaebfbc8a1580e87778511fa10016a9159495e80",
  },
});
const DST = new S3Client({
  endpoint: process.env.DST_ENDPOINT ?? "http://127.0.0.1:19101",
  region: "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: "paic2admin",
    secretAccessKey:
      process.env.DST_SECRET ??
      "20f4d71b0361a5f2c5c4f0da6310d25686e537a161ce2f0b",
  },
});
const BUCKET = "paic2-media";

let token;
const keys = [];
do {
  const res = await SRC.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: "textbooks/",
      ContinuationToken: token,
    }),
  );
  for (const obj of res.Contents ?? []) {
    if (obj.Key) keys.push({ key: obj.Key, size: obj.Size ?? 0 });
  }
  token = res.NextContinuationToken;
} while (token);
const totalBytes = keys.reduce((sum, o) => sum + o.size, 0);
console.log(
  `found ${keys.length} objects, ${(totalBytes / 1e9).toFixed(2)} GB`,
);

let done = 0;
let bytes = 0;
let failed = 0;
let index = 0;
const CONC = 5;
const worker = async () => {
  while (index < keys.length) {
    const item = keys[index++];
    try {
      const obj = await SRC.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: item.key }),
      );
      await DST.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: item.key,
          Body: obj.Body,
          ContentLength: obj.ContentLength,
          ContentType: obj.ContentType ?? "application/octet-stream",
        }),
      );
      done += 1;
      bytes += item.size;
      if (done % 25 === 0 || done === keys.length) {
        console.log(
          `  ${done}/${keys.length} (${(bytes / 1e9).toFixed(2)} GB)`,
        );
      }
    } catch (err) {
      failed += 1;
      console.log(`  FAIL ${item.key}: ${err.message}`);
    }
  }
};
await Promise.all(Array.from({ length: CONC }, worker));
console.log(`finished: ${done} copied, ${failed} failed of ${keys.length}`);
