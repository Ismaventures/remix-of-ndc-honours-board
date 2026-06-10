import re

# Read file
with open('src/components/AdminPanel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all rows={2} with rows={8} for textareas and increase font size
content = re.sub(r'rows=\{2\} className="w-full bg-background border border-\[#002060\]/20 rounded-md px-3 py-2 text-sm', 
                 'rows={8} className="w-full bg-background border border-[#002060]/20 rounded-md px-3 py-2 text-base', 
                 content)

# Replace rows={3} with rows={6}
content = re.sub(r'rows=\{3\} className="w-full bg-background border border-\[#002060\]/20 rounded-md px-3 py-2 text-sm', 
                 'rows={6} className="w-full bg-background border border-[#002060]/20 rounded-md px-3 py-2 text-base', 
                 content)

# Replace rows={4} with rows={8}
content = re.sub(r'rows=\{4\} className="w-full bg-background border border-\[#002060\]/20 rounded-md px-3 py-2 text-sm', 
                 'rows={8} className="w-full bg-background border border-[#002060]/20 rounded-md px-3 py-2 text-base', 
                 content)

# Replace rows={6} with rows={10}
content = re.sub(r'rows=\{6\} className="w-full bg-background border border-\[#002060\]/20 rounded-md px-3 py-2 text-sm', 
                 'rows={10} className="w-full bg-background border border-[#002060]/20 rounded-md px-3 py-2 text-base', 
                 content)

# Write back
with open('src/components/AdminPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated all textarea sizes and font sizes")
