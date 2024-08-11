import requests

url = 'http://localhost:3000/api/data'
data = {
    "ingredient": "Onion",
    "value": "false"
}

response = requests.post(url, json=data)

print('Status Code:', response.status_code)
print('Response Text:', response.text)