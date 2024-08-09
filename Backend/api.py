import requests

url = 'http://localhost:8080/api/data'
data = {
    "ingredient": "Grape",
    "value": "false"
}

response = requests.post(url, json=data)

print('Status Code:', response.status_code)
print('Response Text:', response.text)