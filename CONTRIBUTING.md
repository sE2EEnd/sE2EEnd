# Contributing

First off, thank you for considering contributing to sE2EEnd! It's people like you who make open-source tools better for everyone.

## Pull requests

**Please ask first before starting work on any significant new features.**

To avoid investing time in a feature that might not align with the project's roadmap, please create a GitHub Discussion first.

### Quality standards :
* **Tests**: ensure that the tests are passing. If you add a feature, please include corresponding tests.
* **Code Style**: We follow standard Java / Spring Boot conventions.
* **Security**: Since this is an E2EE project, any change to the cryptographic layer will be stricly audited.

## Development Workflow

### 1. Fork and Branch

Fork the repository and create a branch from main with a descriptive name (e.g., feature/add-xxx-support or fix/connection-xxx).

### 2. Implement your changes

* Write your code.
* Ensure yout local environment is set up with Java 21.
* Run the test suite.

### 3. Commit messages

We appreciate clear and concise commit messages. Follow the seven rules for a great commit message.

### 4. Create a pull request

Once your changes look good and tests are passing, open a PR against our main branch. Github Actions will automatically run the build and tests.

## Questions ?

For any questions, support, or ideas, etc. [please create a GitHub discussion](https://github.com/sE2EEnd/sE2EEnd/discussions/new). If you've noticed a bug, [please submit an issue][new issue].
