import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "./r2";

export async function uploadAudioToR2({
  buffer,
  s_id,
}: {
  buffer: Buffer;
  s_id: string;
}) {

  const key = `store/${s_id}.mp3`;

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: "audio/mpeg",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return {
    key,
    url: `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`,
  };
}
