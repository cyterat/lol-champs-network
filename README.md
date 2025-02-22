# 🎮 League of Legends Champions and Classes Network Visualization

[League of Legends Champions Network](https://lol-champions-network-2baea.ondigitalocean.app/)

This project visualizes the relationships between League of Legends champions and their respective classes. The visualization is created using NetworkX and PyVis libraries, with nodes representing champions and classes, and edges representing the relationships between them.

## Project Overview

The network graph consists of:

- **Champion Nodes**: Represent individual champions, each with an image, tooltip, and other customizable properties.
- **Class Nodes**: Represent the classes to which champions belong, with size based on the number of champions in the class, i.e. its degree.
- **Edges**: Represent the relationships between champions and their classes. The width of each edge depends on the degree of class node.

## Features

- **Custom Nodes**: Nodes are customized with images, tooltips, and border color based on their difficulty, according to Riot (green - easy, yellow - normal, red - hard).
- **Tooltips**: Display additional information about each champion when hovered over.

## Example

Here are some screenshots of the network graph:

### Screenshot 1

![Screenshot 1](/readme/lol-champs-network-0-.png)

### Screenshot 2

![Screenshot 2](/readme/lol-champs-network-1-.png)

## Hosting

The graph visualization has been hosted on Digital Ocean.

## Motivation

This project was created for fun to explore the relationships between different champions and classes in League of Legends.

## Sources

- **Colors, logo, video, font:** [Riot Games](https://brand.riotgames.com/en-us/league-of-legends/fundamentals)

- **Data, champion icons:** [League of Legends Wiki](https://leagueoflegends.fandom.com/wiki/League_of_Legends_Wiki)

## Important Notice

- The html is really messed up, mainly because it was generated through PyVis/NetworkX (Python). Hopefully, I will clean it up and provide the Jupyter notebook, as soon as I have more time.
- I still haven't found any way to increase page responsiveness when zooming out. Disabling physics messes up the layout.
