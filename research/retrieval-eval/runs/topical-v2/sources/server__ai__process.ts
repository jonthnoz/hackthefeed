import { spawn } from 'node:child_process';

export function runCLI(options: { command: string; args: string[]; input: string; cwd: string; timeoutMs: number; hint: string }): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(options.command, options.args, { cwd: options.cwd, stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
    let stdout = '';
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      if (child.pid !== undefined) {
        if (process.platform === 'win32') {
          const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
          killer.on('error', () => child.kill('SIGKILL'));
        } else {
          try { process.kill(-child.pid, 'SIGKILL'); }
          catch { child.kill('SIGKILL'); }
        }
      }
      child.stdin.destroy(); child.stdout.destroy(); child.stderr.destroy();
      reject(new Error(`${options.command} timed out. Increase AI_TIMEOUT_MS or choose a faster model.`));
    }, options.timeoutMs);
    const cleanup = () => { clearTimeout(timeout); };
    child.stdout.on('data', chunk => { stdout += String(chunk); });
    child.stderr.resume();
    child.stdin.on('error', () => { /* The close/error event reports an early process exit. */ });
    child.on('error', () => {
      cleanup();
      reject(new Error(`${options.command} could not start. Install it and make it available on PATH. ${options.hint}`));
    });
    child.on('close', code => {
      cleanup();
      if (timedOut) reject(new Error(`${options.command} timed out. Increase AI_TIMEOUT_MS or choose a faster model.`));
      else if (code !== 0) reject(new Error(`${options.command} exited with code ${code}. ${options.hint}`));
      else resolve(stdout);
    });
    child.stdin.end(options.input);
  });
}
