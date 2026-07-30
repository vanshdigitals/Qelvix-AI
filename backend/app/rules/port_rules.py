def evaluate_ports(port_data: dict) -> list[dict]:
    """
    Port Scanner rules.
    Takes plain dict of port_data and returns a list of finding dicts.
    """
    results = []
    ip = port_data.get("ip", "unknown")
    open_ports = port_data.get("open_ports", [])

    critical_ports = {3389: "RDP", 23: "Telnet", 445: "SMB"}
    high_ports = {3306: "MySQL", 5432: "PostgreSQL", 27017: "MongoDB"}
    medium_ports = {21: "FTP"}

    for port_info in open_ports:
        port = port_info.get("port")
        service = port_info.get("service", "unknown")
        
        if port in critical_ports:
            results.append({
                "type": "open_critical_port",
                "severity": "critical",
                "title": f"Critical port {port} ({critical_ports[port]}) open on {ip}",
                "evidence": {"port": port, "service": service, "ip": ip}
            })
        elif port in high_ports:
            results.append({
                "type": "open_database_port",
                "severity": "high",
                "title": f"Database port {port} ({high_ports[port]}) exposed on {ip}",
                "evidence": {"port": port, "service": service, "ip": ip}
            })
        elif port in medium_ports or (port > 1024 and port not in [3389, 3306, 5432, 27017, 8080, 8443]):
            # Heuristic for non-standard ports
            if port == 21:
                title = f"FTP port 21 open on {ip}"
            else:
                title = f"Non-standard port {port} open on {ip}"
                
            results.append({
                "type": "open_medium_port",
                "severity": "medium",
                "title": title,
                "evidence": {"port": port, "service": service, "ip": ip}
            })

    return results
