import { InputType, Field, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

@InputType()
export class CreatePhotoInput {
  @Field()
  @IsNotEmpty()
  originalFilename: string;

  @Field()
  @IsNotEmpty()
  s3Key: string;

  @Field()
  @IsNotEmpty()
  s3Bucket: string;

  @Field()
  @IsNotEmpty()
  mimeType: string;

  @Field(() => Int)
  fileSize: number;

  @Field(() => Int)
  width: number;

  @Field(() => Int)
  height: number;

  @Field({ nullable: true })
  @IsOptional()
  exifData?: any;

  @Field({ nullable: true })
  @IsOptional()
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  takenAt?: Date;
}