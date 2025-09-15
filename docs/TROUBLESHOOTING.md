# DoraCodeLens Troubleshooting Guide

This guide helps you resolve common issues with DoraCodeLens features.

## General Issues

### Extension Not Loading
**Symptoms**: DoraCodeLens menu doesn't appear in context menu

**Solutions**:
1. Ensure you're right-clicking on a Python file (.py extension)
2. Reload VS Code window (Ctrl+Shift+P → "Developer: Reload Window")
3. Check that the extension is enabled in Extensions panel
4. Verify VS Code version is 1.74.0 or higher

**Recent Fix Applied**: The duplicate command registration issue that caused extension activation failures has been resolved. If you were experiencing activation problems, please restart VS Code to benefit from this fix.

### Command Registration Errors (RESOLVED)
**Previous Symptoms**: Extension failed to activate with "command already exists" errors

**Resolution**: This issue has been fixed in the latest version:
- Centralized command registration in CommandManager
- Removed duplicate command registration from SidebarContentProvider
- Enhanced error handling for command conflicts

**If you still see this error**: Please restart VS Code and ensure you have the latest extension version.

### Analysis Takes Too Long
**Symptoms**: Analysis seems stuck or takes more than 2-3 minutes

**Solutions**:
1. Try **Current File Analysis** instead of Full Code Analysis
2. Check VS Code Output panel for error messages
3. Ensure Python interpreter is properly configured
4. For large projects (1000+ files), consider analyzing specific directories

## Git Analytics Issues

### "No Git Repository Found"
**Symptoms**: Git analytics features show empty results or error messages

**Solutions**:
1. Ensure your project is a Git repository:
   ```bash
   git init  # If not already a Git repo
   ```
2. Verify Git is installed and in your PATH:
   ```bash
   git --version
   ```
3. Check that you have commit history:
   ```bash
   git log --oneline
   ```
4. Ensure you're running analysis from within the Git repository folder

### Git Analytics Shows No Data
**Symptoms**: Git analytics loads but shows empty charts or tables

**Solutions**:
1. Verify you have commits in your repository
2. Check that commits contain Python files
3. Ensure commit authors have proper email configuration
4. Try filtering by a different date range

### Git Commands Fail
**Symptoms**: Error messages about Git commands failing

**Solutions**:
1. Check Git permissions in your project directory
2. Ensure Git is accessible from VS Code's terminal
3. Try running Git commands manually in terminal
4. Check for corrupted Git repository (run `git fsck`)

## Database Schema Issues

### "No Database Schema Found"
**Symptoms**: Database schema analysis shows no results

**Solutions**:
1. Ensure you have one of the supported patterns:
   - Django: `models.py` files with Django model classes
   - SQLAlchemy: Models with SQLAlchemy patterns
   - Raw SQL: `.sql` files or migration files
2. Check that model files are in standard locations
3. Verify your models follow standard naming conventions
4. For Django: Ensure models inherit from `models.Model`
5. For SQLAlchemy: Ensure models use SQLAlchemy declarative base

### Database Graph Not Rendering
**Symptoms**: Database schema tab loads but graph is empty

**Solutions**:
1. Check browser console in the webview (right-click → Inspect Element)
2. Verify table relationships are properly defined in models
3. Ensure foreign key relationships use standard patterns
4. Try refreshing the analysis
5. Check for JavaScript errors in the webview

### Raw SQL Not Extracted
**Symptoms**: Raw SQL tab shows no SQL statements

**Solutions**:
1. Ensure SQL files have `.sql` extension
2. Check migration directories (Django: `migrations/`, Alembic: `alembic/versions/`)
3. Verify SQL statements are properly formatted
4. Look for SQL in Python files (raw queries, migrations)

## JSON Utilities Issues

### JSON Format Fails
**Symptoms**: "JSON Format" command doesn't work or shows errors

**Solutions**:
1. Verify the content is valid JSON:
   - Check for missing quotes around strings
   - Ensure proper comma placement
   - Verify bracket/brace matching
2. Try formatting smaller sections of JSON first
3. Use online JSON validators to identify syntax errors
4. Ensure the file contains JSON content (not just any text)

### JSON Tree View Empty
**Symptoms**: JSON Tree View opens but shows no content

**Solutions**:
1. Ensure you have JSON content selected or cursor in JSON file
2. Verify the JSON is valid (use JSON Format first)
3. Try with a smaller JSON sample
4. Check that the JSON is properly structured (not just a single value)

### JSON Tree View Performance Issues
**Symptoms**: Tree view is slow or unresponsive with large JSON files

**Solutions**:
1. Use JSON Tree View only for reasonably sized JSON (< 1MB)
2. Consider formatting large JSON files instead of using tree view
3. Break large JSON into smaller sections for analysis
4. Use search functionality to find specific elements quickly

## Visualization Issues

### Module Cards Not Displaying Properly
**Symptoms**: Graph view shows plain nodes instead of styled cards

**Solutions**:
1. Refresh the webview (reload the analysis)
2. Check browser console for CSS/JavaScript errors
3. Ensure VS Code theme is compatible
4. Try switching between light and dark themes
5. Clear VS Code cache and restart

### Graph View Performance Issues
**Symptoms**: Graph is slow, laggy, or unresponsive

**Solutions**:
1. Reduce the number of modules being displayed
2. Use filtering options to focus on specific modules
3. Close other resource-intensive VS Code extensions
4. Ensure sufficient system memory (4GB+ recommended)
5. Try Current File Analysis for better performance

### Colors Not Showing Correctly
**Symptoms**: Complexity colors (green/orange/red) not displaying

**Solutions**:
1. Check VS Code theme compatibility
2. Verify complexity thresholds in extension settings
3. Refresh the analysis
4. Try with default VS Code theme
5. Check for CSS conflicts with other extensions

## Export Issues

### Export Functions Not Working
**Symptoms**: Export buttons don't respond or fail

**Solutions**:
1. Ensure you have write permissions in the target directory
2. Check available disk space
3. Try exporting to a different location
4. Verify the analysis completed successfully before exporting
5. Check VS Code Output panel for error messages

### Exported Files Are Empty or Corrupted
**Symptoms**: Exported files contain no data or are unreadable

**Solutions**:
1. Wait for analysis to complete fully before exporting
2. Try different export formats (JSON, CSV, HTML)
3. Check file permissions in the export directory
4. Ensure the analysis contains data to export
5. Try exporting smaller datasets first

## Performance Optimization

### General Performance Tips
1. **Use Current File Analysis** for quick insights during development
2. **Enable caching** in extension settings for faster re-analysis
3. **Close unused tabs** and extensions to free up memory
4. **Analyze specific directories** rather than entire large projects
5. **Update regularly** to get performance improvements

### Memory Issues
**Symptoms**: VS Code becomes slow or unresponsive during analysis

**Solutions**:
1. Close other applications to free up RAM
2. Restart VS Code before running large analyses
3. Use Current File Analysis instead of Full Code Analysis
4. Increase VS Code memory limits if needed
5. Consider analyzing projects in smaller chunks

## Getting Additional Help

### Debug Information
When reporting issues, please include:
1. VS Code version
2. DoraCodeLens extension version
3. Python version
4. Operating system
5. Project size (number of files)
6. Error messages from VS Code Output panel

### Where to Get Help
1. **GitHub Issues**: [Report bugs and request features](https://github.com/your-username/doracodelens-extension/issues)
2. **VS Code Output Panel**: Check for detailed error messages
3. **Extension Settings**: Review configuration options
4. **Documentation**: Refer to [User Guide](USER_GUIDE.md) and [Examples](EXAMPLES.md)

### Diagnostic Commands
Run these commands to gather diagnostic information:

```bash
# Check Python installation
python --version
python -c "import ast, json; print('Python modules OK')"

# Check Git installation
git --version
git status

# Check project structure
find . -name "*.py" | wc -l  # Count Python files
find . -name "models.py"     # Find Django models
find . -name "*.sql"         # Find SQL files
```

### Reset Extension
If all else fails, try resetting the extension:
1. Disable DoraCodeLens extension
2. Reload VS Code window
3. Re-enable the extension
4. Clear any cached data
5. Try analysis on a simple test project first

---

**Still having issues?** Please create a GitHub issue with:
- Detailed description of the problem
- Steps to reproduce
- Error messages
- System information
- Sample project (if possible)

We're here to help! 🚀