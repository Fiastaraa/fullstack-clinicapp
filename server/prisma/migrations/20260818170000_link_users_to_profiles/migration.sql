-- Link authenticated users to their clinic profiles.
ALTER TABLE "Patient" ADD COLUMN "userId" INTEGER;
ALTER TABLE "Doctor" ADD COLUMN "userId" INTEGER;

CREATE UNIQUE INDEX "Patient_userId_key" ON "Patient"("userId");
CREATE UNIQUE INDEX "Doctor_userId_key" ON "Doctor"("userId");

ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
