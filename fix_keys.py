import re

file_path = r'c:\Users\AHMED\Desktop\ndcmuseum\remix-of-ndc-honours-board\src\components\MuseumExperience.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken keys
content = content.replace("key={--media}", "key={\\-\\-media}")
content = content.replace("key={--text}", "key={\\-\\-text}")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Keys fixed.")
