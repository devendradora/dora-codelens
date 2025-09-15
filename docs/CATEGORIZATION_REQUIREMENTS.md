# Tech Stack Categorization Requirements

## Layout Requirements

### Display Layout
- **All subcategories**: Display 2-3 items per row
- **Responsive behavior**:
  - Desktop (>1200px): 3 items per row
  - Tablet (600-1200px): 2 items per row  
  - Mobile (<600px): 1-2 items per row depending on screen size

## Categorization Rules

### Backend Category

#### Frameworks Subcategory
- **Should include ONLY major frameworks**:
  - Django
  - Flask
  - FastAPI
  - Tornado (if detected)
  - Pyramid (if detected)
- **Should NOT include**: Minor or utility frameworks

#### Libraries Subcategory
- **Should include ALL libraries currently categorized as "Others"**
- Examples of libraries that should be in Backend > Libraries:
  - requests
  - psycopg2
  - sqlalchemy
  - celery
  - redis-py
  - boto3
  - pydantic
  - pytest (testing libraries)
  - black (development tools)
  - All other Python packages that are not major frameworks

### Others Category
- **Should be minimized** - most items should be moved to appropriate categories
- **Should only contain**:
  - Configuration files
  - Unknown/unclassified items
  - Non-Python technologies that don't fit other categories

### Frontend Category
- Web-related frontend technologies
- JavaScript frameworks and libraries
- CSS frameworks
- Build tools

### Databases Category
- Database systems
- Database drivers
- Database tools

### DevOps Category
- Containerization (Docker, etc.)
- CI/CD tools
- Infrastructure tools
- Monitoring tools

## Implementation Notes

These rules should be implemented in the Python categorization system (Task 1), not in the TypeScript rendering system. The TypeScript system should only display what Python provides.

## CSS Updates Applied

✅ Updated grid layouts to show 2-3 items per row:
- Desktop: 3 columns
- Tablet: 2 columns  
- Mobile: 1-2 columns

✅ Responsive breakpoints updated to maintain proper item distribution across screen sizes.