# 🎮 League of Legends Champions and Classes Network Visualization

[League of Legends Champions Network](https://lol-champions-network-2baea.ondigitalocean.app/)

This project visualizes the relationships between League of Legends champions and their respective classes. The visualization is created using __vis.js__, with nodes representing various League of Legends entities, currenlty champions and classes, and edges representing the relationships between them.

The implementation focuses on smooth user experience with behind-the-scenes optimizations to handle large amounts of champion data and images efficiently.

## User Features

### Visual Interactions:

- Node Selection: Click on any node to view detailed information and champion builds
- Hover Effects: Nodes highlight with different colors when you hover over them
-Zoom & Pan: Smooth zooming and panning to explore different areas of the network
-Champion Widget: Interactive build recommendations for different roles (TOP, JUNGLE, MID, ADC, SUPPORT)

### Visual Design:

- Node Images: Each champion displays with their official portrait image
- Color-Coded Borders: Different border colors indicate champion types or categories
- Dynamic Highlighting: Selected and hovered nodes change colors for better visibility
- Relationship Lines: Connections between champions show their relationships

## Technical Implementation

### Performance Optimizations:

- Progressive Image Loading: Images load in small batches to prevent freezing during startup
- Memory-Safe DataViews: Uses vis.js DataViews to efficiently filter large datasets without duplicating data
- Fallback Images: Automatic fallback to default images when champion portraits fail to load
- Batch Processing: Loads images in groups of 5 with small delays between batches

### Network Features:

- Dynamic Filtering: Switch between different relationship types (implemented with DataView filtering)
- Auto-Fitting: Network automatically adjusts view to show filtered content
- Loading Indicators: Visual feedback during view transitions
- Error Handling: Graceful handling of missing data or failed image loads

## Integration:

- External Widget Support: Integrates with Mobalytics widgets for champion builds
- Responsive Layout: Tooltip panels position dynamically based on screen space
- Event-Driven Architecture: Modular event handling for user interactions

## Example

Here are some screenshots of the network graph:

### ~~Examples~~

![Screenshot 1](/readme/lol-champs-network-0.png)

![Screenshot 2](/readme/lol-champs-network-1.png)

## Hosting

The graph visualization is hosted on Digital Ocean.

## Motivation

This project was created for fun to visualize the distributions and relationships between different entities in League of Legends.

## Sources

- **Colors, logo, font:** [Riot Games](https://brand.riotgames.com/en-us/league-of-legends/fundamentals)

- **Data, champion icons, colors:** [Mobalytics](https://mobalytics.gg/lol)

- **Champion builds widget:** [Mobalytics](https://github.com/mobalyticshq/mobalytics-widgets)

- **Page background image:** [Muzli Search](https://search.muz.li/OGExNmFiZWVj)

- **Data, icons:** [League of Legends Wiki](https://leagueoflegends.fandom.com/wiki/League_of_Legends_Wiki)


## Important Notice - 2025 Rework

- The first version of the project was built using python NetworkX and PyVis libraries. It had extremely poor performance and messed up html and javascript, as it was 'generated' through python libraries. That's why I decided to completely rework it, using cleaner, HTML/CSS/Javascript only, approach and app structure.

- The entire data scraping, cleansing, aggregation, and conversion to appropriate json format was done using python. Currenlty it still sits in the Jupyter Notebook, waiting to be refactored into a separate script that will potentially have a scheduled run.

## To Do

- ~~Python generated visualization will be replaced with html/js/css trio.~~
- Several views (network combinations) will be implemented.
- Additional League of Legends entities will be added.
- Scheduled script written in Python, for data manipulations, will be implemented. 