import os
from typing import Any

img_dir = os.path.join("app","assets","champions")

print(os.listdir(img_dir))


id: str = None # entity name (unique)
shape = None # "circularImage", "image"
type = None # champion, item, team, lane, etc
image: str | os.PathLike = None # path to image
opacity: float = 0.0
brokenImage: str | os.PathLike  = None # path to fallback image
label: str = None
description: str = None
value: int = None

node: dict[str, str] = {
    "id": id,
    "shape": shape,
    "image": image,
    "brokenImage": brokenImage,
    "label": label,
    "description": description,
}

node_list: list[dict] = []
# node_list.append(node)

###############################################################
###############################################################

source: str = None # entity name (unique)
target: str = None # entity name (unique)
weight: float|int = None # 0.5 or 10
label: str|None = None # 
arrowToSource: bool = False
arrowToTarget: bool = False

edge: dict[str, str] = {
    "source": id,
    "target": id,
    "arrowToSource": arrowToSource,
    "arrowToTarget": arrowToTarget,
    "weight": weight,
    "label": label,
    "bidirectional": bidirectional,
}

# {"nodes": [
#     {
#       "id": 1,
#       "shape": "circularImage",
#       "image": "",
#       "brokenImage": "champions/Aatrox.webp",
#       "label": "Alice Johnson",
#       "description": "Senior Software Engineer with expertise in frontend development.\n• 5+ years experience in React and Vue.js\n• Led multiple successful product launches\n• Passionate about UI/UX design\n• Mentor for junior developers"
#     },}

# "edges": [
#     {
#       "from": 1,
#       "to": "4",
#       "weight": 3,
#       "label": "Works at"
#     },