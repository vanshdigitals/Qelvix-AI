from app.agents.state import AgentState
import yaml
import os

def load_playbooks():
    playbooks = {}
    playbooks_dir = "playbooks"
    if os.path.exists(playbooks_dir):
        for f in os.listdir(playbooks_dir):
            if f.endswith(".yaml") or f.endswith(".yml"):
                with open(os.path.join(playbooks_dir, f), 'r') as file:
                    data = yaml.safe_load(file)
                    playbooks[data.get("finding_type")] = data
    return playbooks

async def run(state: AgentState) -> dict:
    all_findings = state.get("all_findings", [])
    playbooks = load_playbooks()
    
    ir_plan = {}
    for i, finding in enumerate(all_findings):
        ftype = finding.get("finding_type")
        finding_id = f"finding_{i}"
        
        if ftype in playbooks:
            ir_plan[finding_id] = playbooks[ftype]
        else:
            ir_plan[finding_id] = {"action": "manual_review", "reason": "No playbook found"}
            
    return {"ir_plan": ir_plan}
