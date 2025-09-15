// Simple Node.js test to verify categorization works
const {
  TechnologyCategorizer,
} = require("./out/services/technology-categorizer");
const { CategoryRenderer } = require("./out/services/category-renderer");

// Mock ErrorHandler
class MockErrorHandler {
  logError(message, error, source) {
    console.log(`[${source}] ${message}`, error ? error.message : "");
  }
}

async function testCategorization() {
  console.log("🧪 Testing Technology Categorization...\n");

  const errorHandler = new MockErrorHandler();
  const categorizer = new TechnologyCategorizer(errorHandler);
  const renderer = new CategoryRenderer(errorHandler);

  // Test data
  const technologies = [
    "django",
    "react",
    "postgresql",
    "docker",
    "pytest",
    { name: "flask", version: "2.0" },
    { name: "vue", version: "3.0" },
    { name: "redis", version: "6.0" },
    { name: "kubernetes", version: "1.21" },
    { name: "numpy", version: "1.21" },
  ];

  console.log(
    "📋 Input technologies:",
    technologies
      .map((t) => (typeof t === "string" ? t : `${t.name}@${t.version}`))
      .join(", ")
  );
  console.log();

  // Categorize
  const categories = categorizer.categorizeTechnologies(technologies);

  console.log("📊 Categorization Results:");
  console.log("=========================");

  for (const [categoryName, category] of categories) {
    console.log(
      `\n${category.icon} ${category.displayName} (${category.count} technologies):`
    );
    category.technologies.forEach((tech) => {
      const version = tech.version ? `@${tech.version}` : "";
      const confidence = `${(tech.confidence * 100).toFixed(0)}%`;
      console.log(`  • ${tech.name}${version} (${confidence} confidence)`);
    });
  }

  // Test rendering
  console.log("\n🎨 HTML Rendering Test:");
  console.log("======================");

  const html = renderer.renderCategorizedTechStack(categories);
  const hasExpectedElements = [
    "tech-categories-container",
    "🔧",
    "🎨",
    "🗄️",
    "⚙️",
    "📦",
    "django",
    "react",
    "postgresql",
    "docker",
    "pytest",
  ].every((element) => html.includes(element));

  console.log(
    `HTML contains expected elements: ${hasExpectedElements ? "✅" : "❌"}`
  );
  console.log(`HTML length: ${html.length} characters`);

  // Test performance
  console.log("\n⚡ Performance Test:");
  console.log("===================");

  const largeTechList = [];
  for (let i = 0; i < 500; i++) {
    largeTechList.push(`library-${i}`);
  }
  largeTechList.push(...technologies);

  const startTime = Date.now();
  const largeCategories = categorizer.categorizeTechnologies(largeTechList);
  const endTime = Date.now();

  console.log(
    `Processed ${largeTechList.length} technologies in ${endTime - startTime}ms`
  );
  console.log(`Categories created: ${largeCategories.size}`);

  // Test database detection
  console.log("\n🗄️ Database Detection Test:");
  console.log("===========================");

  const analysisData = {
    tech_stack: {
      libraries: ["psycopg2", "pymongo", "django"],
      frameworks: [{ name: "django", version: "4.0" }],
    },
  };

  const dbCategories = categorizer.categorizeTechnologies(
    ["django"],
    analysisData
  );
  const databasesCategory = dbCategories.get("databases");

  console.log(`Database category exists: ${databasesCategory ? "✅" : "❌"}`);
  if (databasesCategory) {
    console.log(`Database technologies detected: ${databasesCategory.count}`);
    databasesCategory.technologies.forEach((tech) => {
      console.log(
        `  • ${tech.name} (${(tech.confidence * 100).toFixed(0)}% confidence)`
      );
    });
  }

  console.log("\n✅ All tests completed successfully!");
}

testCategorization().catch(console.error);
