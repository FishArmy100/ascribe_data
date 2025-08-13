import subprocess


result = subprocess.run(['diatheke.exe', '--help'], capture_output=True, text=True)
print(result.returncode)
print(result.stdout)
print(result.stderr)