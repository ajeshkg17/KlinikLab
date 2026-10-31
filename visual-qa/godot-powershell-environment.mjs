/** Strict Windows PowerShell 5.1 process env for a pwsh -> Node -> powershell.exe chain.
 *
 * Microsoft about_PSModulePath documents that Node inherits PowerShell 7's
 * PSModulePath and passes it to Windows PowerShell without pwsh's special
 * WinPSModulePath conversion. The wrong Microsoft.PowerShell.Utility version
 * can then win module resolution and Get-FileHash becomes CommandNotFound.
 *
 * Drop only the *child* PSModulePath. Windows PowerShell reconstructs its own
 * edition-specific defaults. Never change the user's parent shell or registry.
 */
export function cleanWindowsPowerShellEnv(inherited = process.env) {
  const env = {...inherited};
  for (const name of Object.keys(env)) {
    if (name.toUpperCase() === 'PSMODULEPATH') delete env[name];
  }
  return env;
}
