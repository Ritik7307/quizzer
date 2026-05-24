import { exec } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const SANDBOX_DIR = path.resolve(process.cwd(), "temp_sandbox");

interface RunResult {
  status: "Accepted" | "Wrong Answer" | "Compile Error" | "Runtime Error" | "Time Limit Exceeded" | "System Error";
  output: string;
  errorDetails?: string;
}

// Helper to run a command with timeout and stdin input
function execWithTimeout(
  cmd: string,
  cwd: string,
  stdin: string,
  timeoutMs = 3000
): Promise<{ stdout: string; stderr: string; code: number | null; error: Error | null }> {
  return new Promise((resolve) => {
    const child = exec(cmd, { cwd }, (error, stdout, stderr) => {
      resolve({
        stdout,
        stderr,
        code: child.exitCode,
        error,
      });
    });

    // Write input to stdin and close it
    if (child.stdin) {
      child.stdin.write(stdin);
      child.stdin.end();
    }

    // Enforce timeout
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({
        stdout: "",
        stderr: "Time Limit Exceeded",
        code: null,
        error: new Error("SIGKILL"),
      });
    }, timeoutMs);

    child.on("close", () => {
      clearTimeout(timeout);
    });
  });
}

// Clean up sandbox folder
function deleteFolderRecursive(dirPath: string) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
}

export async function compileAndRun(
  code: string,
  language: string,
  stdin: string
): Promise<RunResult> {
  const isWindows = process.platform === "win32";
  const id = crypto.randomUUID();
  const runDir = path.join(SANDBOX_DIR, id);

  try {
    // Create sandbox and individual run directories
    if (!fs.existsSync(SANDBOX_DIR)) {
      fs.mkdirSync(SANDBOX_DIR, { recursive: true });
    }
    fs.mkdirSync(runDir, { recursive: true });

    let sourceFile = "";
    let compileCmd = "";
    let runCmd = "";

    if (language === "cpp") {
      sourceFile = path.join(runDir, "code.cpp");
      fs.writeFileSync(sourceFile, code);
      const binaryName = isWindows ? "code.exe" : "code";
      compileCmd = `g++ code.cpp -o ${binaryName}`;
      runCmd = isWindows ? binaryName : `./${binaryName}`;
    } else if (language === "c") {
      sourceFile = path.join(runDir, "code.c");
      fs.writeFileSync(sourceFile, code);
      const binaryName = isWindows ? "code.exe" : "code";
      compileCmd = `gcc code.c -o ${binaryName}`;
      runCmd = isWindows ? binaryName : `./${binaryName}`;
    } else if (language === "java") {
      // Create Main.java class
      sourceFile = path.join(runDir, "Main.java");
      fs.writeFileSync(sourceFile, code);
      compileCmd = "javac Main.java";
      runCmd = "java Main";
    } else {
      return { status: "SystemError" as any, output: "Unsupported language" };
    }

    // 1. Compile phase
    const compileRes = await new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve) => {
      exec(compileCmd, { cwd: runDir }, (err, stdout, stderr) => {
        resolve({
          stdout,
          stderr,
          code: err ? (err as any).code : 0,
        });
      });
    });

    if (compileRes.code !== 0) {
      const errMsg = compileRes.stderr || compileRes.stdout;
      // Check if compiler is missing
      if (errMsg.includes("not recognized") || errMsg.includes("not found") || errMsg.includes("Command failed")) {
        return {
          status: "Compile Error",
          output: "Compiler not installed",
          errorDetails: `The required compiler for ${language} is not installed or configured on the server PATH.\n\nError details: ${errMsg}`,
        };
      }
      return {
        status: "Compile Error",
        output: "Compilation failed",
        errorDetails: errMsg,
      };
    }

    // 2. Execution phase
    const runRes = await execWithTimeout(runCmd, runDir, stdin, 3000);

    if (runRes.stderr === "Time Limit Exceeded") {
      return {
        status: "Time Limit Exceeded",
        output: "Execution timed out (Limit: 3s)",
      };
    }

    if (runRes.error && runRes.code !== 0) {
      return {
        status: "Runtime Error",
        output: "Program crashed",
        errorDetails: runRes.stderr || runRes.stdout || runRes.error.message,
      };
    }

    return {
      status: "Accepted", // This means ran successfully, caller checks output correctness
      output: runRes.stdout,
    };
  } catch (error: any) {
    console.error("[Compiler Error]", error);
    return {
      status: "System Error" as any,
      output: "An internal compiler error occurred",
      errorDetails: error.message,
    };
  } finally {
    // 3. Clean up files in background
    try {
      deleteFolderRecursive(runDir);
    } catch (cleanupError) {
      console.error("[Compiler Cleanup Failed]", cleanupError);
    }
  }
}
