with open('frontend/components/dashboard/DashboardOverview.tsx', 'rb') as f:
    data = f.read()
    if b'\x00' in data:
        print('NUL byte found at index:', data.index(b'\x00'))
    else:
        print('No NUL bytes found')
