from ultralytics import YOLO

#f
# Load a model
model = YOLO("./weights/yolov10n.pt")  # load a pretrained model (recommended for training)
custom_dataset = "./datasets/GroceryItems/data.yaml"

# Train the model with 2 GPUs
results = model.train(data=custom_dataset, epochs=25, imgsz=640, device="mps")

