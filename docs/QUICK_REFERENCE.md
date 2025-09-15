# DoraCodeLens Quick Reference

## Context Menu Quick Access

```
Right-click on Python file:
```

| Feature | Menu Item | What it does |
|---------|-----------|--------------|
| **Full Analysis** | Full Code Analysis | Complete project analysis with tabbed interface |
| **File Analysis** | Current File Analysis | Analyze just the current file |
| **Enable Code Lens** | Enable Code Lens Inline | Enable inline complexity annotations |
| **Disable Code Lens** | Disable Code Lens Inline | Disable inline complexity annotations |
| **DB Analysis** | Database Schema Analysis | Complete database structure analysis |
| **Git Analytics** | Git Analytics | Repository insights and team statistics |
| **Format JSON** | JSON Format | Beautify JSON in current editor |
| **JSON Tree** | JSON Tree View | Expandable JSON structure explorer |
| **JSON Fix** | JSON Fix (Python Dict) | Convert Python dict to valid JSON |
| **JSON Compress** | JSON Minify | Compress JSON content |
| **Python Setup** | Setup Python Path | Configure Python interpreter |
| **Auto-Detect** | Auto-Detect Python Path | Automatically find Python |
| **Settings** | Settings | Open extension configuration |
| **Clear Cache** | Clear Cache | Clear analysis cache |

## Command Palette Quick Access

```
Ctrl+Shift+P → DoraCodeLens: [Command]
```

| Command | Shortcut | What it does |
|---------|----------|--------------|
| **Full Code Analysis** | `Ctrl+Shift+P` → `DoraCodeLens: Full Code Analysis` | Complete project analysis |
| **Current File Analysis** | `Ctrl+Shift+P` → `DoraCodeLens: Current File Analysis` | Analyze current file only |
| **Refresh Analysis** | `Ctrl+Shift+P` → `DoraCodeLens: Refresh Full Code Analysis` | Force refresh cache |
| **Enable Code Lens** | `Ctrl+Shift+P` → `DoraCodeLens: Code Lens (On)` | Enable inline annotations |
| **Disable Code Lens** | `Ctrl+Shift+P` → `DoraCodeLens: Code Lens (Off)` | Disable Code Lens |
| **Clear Cache** | `Ctrl+Shift+P` → `DoraCodeLens: Clear Cache` | Clear analysis cache |
| **Cancel Analysis** | `Ctrl+Shift+P` → `DoraCodeLens: Cancel Analysis` | Stop running analysis |

## Complexity Color Coding

| Color | Complexity | Action Needed |
|-------|------------|---------------|
| 🟢 **Green** | Low (1-5) | Good to go ✅ |
| 🟡 **Orange** | Medium (6-10) | Monitor ⚠️ |
| 🔴 **Red** | High (11+) | Refactor needed ❌ |

## Git Analytics Metrics

| Metric | Description |
|--------|-------------|
| **Commits** | Total commits by author |
| **Lines Added** | New code contributed |
| **Lines Removed** | Code deleted/refactored |
| **Contribution %** | Relative team contribution |
| **Module Touch** | Modules modified by author |
| **Activity Period** | When author was most active |

## Database Schema Symbols

| Symbol | Meaning |
|--------|---------|
| 🔑 | Primary Key |
| 🔗 | Foreign Key |
| 📧 | Unique Constraint |
| 📝 | Text/String Field |
| 🔢 | Numeric Field |
| 📅 | Date/Time Field |
| 🔒 | Encrypted/Sensitive Field |

## JSON Tree View Icons

| Icon | Data Type |
|------|-----------|
| 📄 | Root Object |
| 🔽/🔼 | Expandable Object |
| 📝 | String Value |
| 🔢 | Number Value |
| ✅/❌ | Boolean Value |
| 📋 | Array |
| ∅ | Null Value |

## Export Formats

| Format | Best For |
|--------|----------|
| **JSON** | Programmatic processing, APIs |
| **CSV** | Spreadsheet analysis, metrics |
| **HTML** | Reports, stakeholder sharing |
| **PNG/SVG** | Presentations, documentation |

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open Command Palette | `Ctrl+Shift+P` |
| Search in JSON Tree | `Ctrl+F` |
| Zoom Graph | `Mouse Wheel` |
| Pan Graph | `Mouse Drag` |
| Reset Graph View | `Double Click` |

## Common File Patterns

DoraCodeLens automatically detects:

| Pattern | Framework |
|---------|-----------|
| `models.py` | Django Models |
| `views.py` | Django/Flask Views |
| `app.py` | Flask Application |
| `main.py` | FastAPI Application |
| `settings.py` | Django Settings |
| `requirements.txt` | Python Dependencies |
| `pyproject.toml` | Modern Python Projects |
| `migrations/` | Database Migrations |

## Troubleshooting Quick Fixes

| Problem | Quick Fix |
|---------|-----------|
| No analysis data | Ensure Python files exist in project |
| Git analytics empty | Check if folder is Git repository |
| DB schema not found | Verify models.py or SQL files exist |
| JSON format fails | Check JSON syntax validity |
| Slow performance | Try Current File Analysis instead |
| Extension not loading | Reload VS Code window |

## Performance Tips

| Scenario | Recommendation |
|----------|----------------|
| Large project (1000+ files) | Use Current File Analysis |
| Huge Git history | Filter by date range |
| Complex database | Focus on specific tables |
| Large JSON files | Use Tree View for navigation |
| Multiple analyses | Wait for completion before next |

## Configuration Quick Reference

### Essential Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `doracodelens.pythonPath` | `"python3"` | Python interpreter path |
| `doracodelens.analysisTimeout` | `120` | Analysis timeout (seconds) |
| `doracodelens.enableDebugLogging` | `false` | Enable debug logging |
| `doracodelens.codeLens.showComplexity` | `true` | Show complexity indicators |
| `doracodelens.codeLens.showSuggestions` | `true` | Show actionable suggestions |
| `doracodelens.guidance.enabled` | `true` | Enable guidance system |
| `doracodelens.guidance.autoRunAnalysisOnEnable` | `false` | Auto-run when enabled |

### Complexity Thresholds

| Threshold | Default | Range | Color |
|-----------|---------|-------|-------|
| Low | `5` | 1-50 | 🟢 Green |
| Medium | `10` | 1-50 | 🟡 Orange |
| High | `11` | 1-50 | 🔴 Red |

### Access Settings
1. `Ctrl+,` → Search "DoraCodeLens"
2. Command Palette → `DoraCodeLens: Settings`
3. Context Menu → Settings

## Best Practices

### Daily Development
1. Use **Current File Analysis** while coding
2. Check **complexity colors** before committing
3. Format JSON with **JSON utilities** when needed
4. Enable **Code Lens** for inline complexity feedback

### Weekly Reviews
1. Run **Full Code Analysis** to check project health
2. Review **Git Analytics** for team activity patterns
3. Check **Database Schema** for model changes
4. Export **reports** for documentation updates

### Monthly Planning
1. Analyze **Git Analytics** for long-term patterns
2. Review **complexity trends** across modules
3. Focus refactoring on **red complexity** modules
4. Update **Database Schema** documentation
5. Review and adjust **complexity thresholds**

### Team Collaboration
1. Share **Graph Views** in architecture discussions
2. Use **Git Analytics** for sprint planning and retrospectives
3. Export **visualizations** for presentations and documentation
4. Track **complexity trends** and code quality metrics over time
5. Use **Database Schema** graphs for data modeling discussions

### Performance Optimization
1. Use **Current File Analysis** for large projects
2. Enable **caching** for faster subsequent analyses
3. Adjust **analysis timeout** for complex projects
4. Use **selective analysis** rather than full project scans
5. Monitor **debug logs** for performance bottlenecks

---

## Quick Start Checklist

- [ ] Install DoraCodeLens extension
- [ ] Open a Python project
- [ ] Right-click any .py file
- [ ] Try **Full Code Analysis → Tech Stack**
- [ ] Explore **Graph View** with module cards
- [ ] Check **Git Analytics** if in Git repo
- [ ] Test **JSON Utils** on any JSON data
- [ ] Export results for sharing

**Need help?** Check the full [User Guide](USER_GUIDE.md) or [Examples](EXAMPLES.md) for detailed instructions.