with open('frontend/components/dashboard/DashboardOverview.tsx', 'rb') as f:
    data = f.read(20)
    print("Hex:", data.hex())
