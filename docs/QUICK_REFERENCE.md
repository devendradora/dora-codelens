# DoraCodeLens Quick Reference

## Context Menu Quick Access

```
Right-click on Python file → DoraCodeLens →
```

| Feature | Path | What it does |
|---------|------|--------------|
| **Tech Stack** | Full Code Analysis → Tech Stack | Shows detected frameworks & libraries |
| **Module Graph** | Full Code Analysis → Graph View | Interactive module dependency visualization |
| **Raw Data** | Full Code Analysis → JSON View | Complete analysis data in JSON format |
| **File Analysis** | Current File Analysis → [View] | Analyze just the current file |
| **Call Tree** | Call Hierarchy → Graph View | Function call relationships |
| **Git Stats** | Git Commits → Author Statistics | Contributor analysis & statistics |
| **Module Git** | Git Commits → Module Contributions | Git activity per module/folder |
| **Commit History** | Git Commits → Commit Timeline | Visual commit timeline |
| **DB Graph** | DB Schema → Graph View | Database schema visualization |
| **SQL View** | DB Schema → Raw SQL | Extracted SQL statements |
| **Format JSON** | JSON Utils → JSON Format | Beautify JSON in current editor |
| **JSON Tree** | JSON Utils → JSON Tree View | Expandable JSON structure |

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

## Best Practices

### Daily Development
1. Use **Current File Analysis** while coding
2. Check **complexity colors** before committing
3. Format JSON with **JSON Utils** when needed

### Weekly Reviews
1. Run **Full Code Analysis** to check project health
2. Review **Git Analytics** for team activity
3. Export **HTML reports** for documentation

### Monthly Planning
1. Analyze **Git Commit Timeline** for patterns
2. Review **Module Contributions** for ownership
3. Focus refactoring on **red complexity** modules
4. Update **Database Schema** documentation

### Team Collaboration
1. Share **Graph Views** in architecture discussions
2. Use **Git Analytics** for sprint planning
3. Export **visualizations** for presentations
4. Track **complexity trends** over time

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