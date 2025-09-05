If you're encountering a 403 error when running `terraform init` to download a module, but can clone the repository using bare Git, ensure the module is correctly located at the specified path within the Git repository. Also, ensure the path is formatted correctly.

Here's how your source URL in your [[Terraform]] script should look:

```terraform
module "my_module" {
  source = "git::https://github.com/your-org/terraform_modules.git//my_module"
}
```

The `//` before the path is crucial. It indicates to Terraform that the module is located within the repository at that specific path, rather than being part of the repository URL itself.

Without the double slash, Git will try to run `git clone https://github.com/your-org/terraform_modules.git/my_module`, which will likely result in a 403 error if you run it in your terminal.