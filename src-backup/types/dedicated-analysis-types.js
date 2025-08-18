"use strict";
/**
 * Enhanced graph data models for dedicated analysis views
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultComplexityColors = void 0;
exports.defaultComplexityColors = {
    low: {
        range: [0, 5],
        color: '#4CAF50',
        description: 'Low complexity - easy to maintain',
        textColor: '#FFFFFF'
    },
    medium: {
        range: [6, 10],
        color: '#FF9800',
        description: 'Medium complexity - consider refactoring',
        textColor: '#FFFFFF'
    },
    high: {
        range: [11, Infinity],
        color: '#F44336',
        description: 'High complexity - needs refactoring',
        textColor: '#FFFFFF'
    },
    unknown: {
        range: [-1, -1],
        color: '#9E9E9E',
        description: 'Unknown complexity',
        textColor: '#FFFFFF'
    }
};
//# sourceMappingURL=dedicated-analysis-types.js.map