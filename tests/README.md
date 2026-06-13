# LMVideoStudio tests

## ffmpeg orphan regression suite

GPU-free regression tests in `LMVideoStudio.Host.Tests/FfmpegOrphanRegressionTests.fs` guard against orphaned `ffmpeg.exe` processes and incomplete shutdown cleanup.

| Test | What it verifies |
|------|------------------|
| `runProcess timeout kills child and clears registry` | Timed-out child processes are killed and unregistered |
| `killAllActive clears tracked process registry` | Manual kill clears all tracked PIDs |
| `concurrent slow kenBurns hooks are not single-flight at export layer` | `FfmpegExport` itself does not serialize; callers own concurrency |
| `second preview cancels first and keeps ffmpeg hook single-flight` | `ExportJobs` cancels superseded preview jobs and runs one FFmpeg stitch at a time |
| `CancelActive kills tracked child processes` | Job cancel tears down registered child processes |
| `host shutdown invokes killAllActive` | `ApplicationStopping` calls `killAllActive` on host dispose |
| `dev.ps1 parses and includes orphan ffmpeg cleanup` | `scripts/dev.ps1` defines `Stop-LmvsFfmpegChildren` and calls it in a `finally` block |

Run with:

```powershell
make test
# or
.\scripts\test.ps1
```
