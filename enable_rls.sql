-- Run this script in your Supabase SQL Editor to enable Row Level Security on all your tables.
-- This will resolve the "Table publicly accessible" security warnings in Supabase.
-- Since you are using Prisma from a backend server, your backend will still be able to access the database normally (as Prisma bypasses RLS by default when using the connection string).

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Quiz" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Question" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CodingQuestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CodingSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Feedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CompilerNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Resource" ENABLE ROW LEVEL SECURITY;
