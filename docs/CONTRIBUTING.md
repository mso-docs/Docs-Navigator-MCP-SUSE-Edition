# Contributing to Docs Navigator MCP - SUSE Edition

![Docs Navigator Logo](.\.\assets\docs-nav-suse.png)

Thank you for your interest in contributing to this project!

## Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Docs-Navigator-MCP-SUSE-Edition.git
   cd Docs-Navigator-MCP-SUSE-Edition
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Set up your environment:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. Build and test:
   ```bash
   npm run build
   npm start
   ```

## Project Structure

```
src/
├── index.ts                      # Main MCP server entry point
└── services/
    ├── ai-service.ts            # AI model integration
    ├── documentation-service.ts # Documentation fetching
    └── vector-service.ts        # Vector database operations
```

## Making Changes

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes
3. Test thoroughly
4. Commit with clear messages:
   ```bash
   git commit -m "Add: description of your changes"
   ```

5. Push and create a Pull Request

## Code Style

- Use TypeScript strict mode
- Follow existing code formatting
- Add comments for complex logic
- Update documentation for new features

## Testing

Before submitting:

1. Ensure TypeScript compiles without errors:
   ```bash
   npm run build
   ```

2. Test with your MCP client
3. Verify all tools work as expected

## Adding New Features

### Adding a New Documentation Source

1. Update `DocumentationService` in `src/services/documentation-service.ts`
2. Add source configuration to `.env.example`
3. Update README documentation

### Adding a New Tool

1. Add tool definition in `src/index.ts` `getTools()` method
2. Implement handler method
3. Update README with usage examples

## Pull Request Guidelines

- Provide clear description of changes
- Reference any related issues
- Include examples of new features
- Update documentation as needed

## Questions?

Open an issue for discussion before major changes.

Happy hacking! 🚀
