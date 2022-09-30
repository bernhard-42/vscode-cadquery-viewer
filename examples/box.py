import cadquery as cq
from cq_vscode import show

box = cq.Workplane().box(1, 1, 1).edges().chamfer(0.1)
show(box, reset_camera=True)
