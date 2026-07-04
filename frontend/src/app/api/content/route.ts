import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const track = searchParams.get("track");
  const moduleName = searchParams.get("module");

  if (!track || !moduleName) {
    return NextResponse.json({ error: "Missing track or module parameters" }, { status: 400 });
  }

  try {
    // Construct the path to the markdown file
    const contentPath = path.join(process.cwd(), "src", "content", track, `${moduleName}.md`);
    
    // Read the file content
    const fileContent = await fs.readFile(contentPath, "utf-8");
    
    return NextResponse.json({ content: fileContent });
  } catch (error) {
    console.error(`Failed to read content for ${track}/${moduleName}:`, error);
    // If file doesn't exist, return a default placeholder instead of throwing a 500
    const placeholder = `
# ${moduleName.replace(/-/g, ' ')}

This module is currently under construction. Check back soon for exhaustive FAANG-level documentation!

> **Note:** The curriculum engine is active, but the content team has not yet uploaded the markdown file for \`${track}/${moduleName}\`.
    `;
    return NextResponse.json({ content: placeholder });
  }
}
