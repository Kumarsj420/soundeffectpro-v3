import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "./r2";

export async function uploadThumbToR2({
  buffer,
  sb_id,
  contentType = "image/webp",
}: {
  buffer: Buffer;
  sb_id: string;
  contentType?: string;
}) {

  const key = `thumb/${sb_id}.webp`;

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return {
    key,
    url: `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`,
  };
}
