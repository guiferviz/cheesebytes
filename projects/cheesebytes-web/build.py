from pathlib import Path
import shutil
import shlex
import platform

import sisifo

CHEESEBYTES_PUBLIC_REPO_SSH = "git@github.com:guiferviz/cheesebytes.git"


@sisifo.task
def install_git_filter_repo():
    if shutil.which("git-filter-repo"):
        return sisifo.skip("git-filter-repo is already installed")
    sysname = platform.system()
    if sysname == "Darwin":
        sisifo.shell("brew install git-filter-repo")
    elif shutil.which("apt-get"):
        sisifo.shell(
            "sudo apt-get update -y && sudo apt-get install -y git-filter-repo"
        )
    else:
        raise RuntimeError(
            "Unsupported OS: need Homebrew (macOS) or apt-get (Ubuntu/Debian)"
        )


@sisifo.task
def publish_subtree_to_repo():
    install_git_filter_repo()
    dest_dir = "/tmp/cheesebytes-export"
    root = sisifo.get_git_root()
    assert root
    export_paths = [root / "projects/cheesebytes-web", root / "notes/Cheese Bytes"]
    # Commit: adding cheesebytes web pointing to notes under `notes/Cheese Bytes`
    # Used to limit the export range and speed up the process.
    first_commit = "d221709c7dcf999f0e4ad66bb857b5feadb9198d"

    dest = Path(dest_dir)
    dest.mkdir(parents=True, exist_ok=True)
    if not (dest / ".git").exists():
        sisifo.shell(f"git -C {dest} init")
        sisifo.shell(f"git -C {dest} branch -m main")

    export_paths_str = " ".join(shlex.quote(str(p)) for p in export_paths)
    print(sisifo.shell_output(f"git branch --contains {first_commit}"))
    if sisifo.shell_output(f"git branch --contains {first_commit}"):
        print("Commit exists")
    else:
        print("Commit does not exist")
    sisifo.shell(
        f"git fast-export {first_commit}^..main -- {export_paths_str} | (cd {dest} && git fast-import)"
    )
    sisifo.shell(f"git -C {dest} checkout -f")
    sisifo.shell(f"git -C {dest} branch -M main")
    sisifo.shell(
        f"git -C {dest} filter-repo --force --path-rename 'projects/cheesebytes-web/.github:.github'"
    )
    sisifo.shell(f"git -C {dest} remote add origin {CHEESEBYTES_PUBLIC_REPO_SSH}")


if __name__ == "__main__":
    sisifo.run_cli()
