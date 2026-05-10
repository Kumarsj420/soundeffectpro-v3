import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "./r2";

export async function uploadToR2({
    file,
    folder,
    fileName,
    contentType,
}: {
    file: Buffer;
    folder: "store" | "thumb" | "avatars";
    fileName: string;
    contentType: string;
}) {

    const key = `${folder}/${fileName}`;

    await r2.send(
        new PutObjectCommand({
            Bucket: process.env.R2_BUCKET!,
            Key: key,
            Body: file,
            ContentType: contentType,
            CacheControl: "public, max-age=31536000, immutable",
        })
    )

    return {
        key,
        fileName,
        url: `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`,
    }


}