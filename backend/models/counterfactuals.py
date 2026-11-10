from typing import Dict, Any, List
import pandas as pd
import numpy as np
import copy
from .risk_engine import RiskEngine

class Counterfactuals:
    def __init__(self, risk_engine: RiskEngine):
        self.risk_engine = risk_engine

    def simulate_scenarios(self, patient_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generates predefined scenarios to see if risk can be lowered.
        """
        scenarios = []
        original_risk = self.risk_engine.predict_risk(patient_data)
        
        # Scenario 1: Reduce BMI by 5%
        if patient_data.get('bmi', 0) > 25:
            new_data = copy.deepcopy(patient_data)
            new_data['bmi'] = new_data['bmi'] * 0.95
            new_risk = self.risk_engine.predict_risk(new_data)
            scenarios.append({
                "name": "Lose 5% Weight",
                "change_description": f"Reduce BMI to {new_data['bmi']:.1f}",
                "original_risk": original_risk,
                "new_risk": new_risk,
                "risk_reduction": original_risk - new_risk
            })

        # Scenario 2: Reduce HbA1c by 1.0
        if patient_data.get('HbA1c_level', 0) > 6.0:
            new_data = copy.deepcopy(patient_data)
            new_data['HbA1c_level'] = max(5.0, new_data['HbA1c_level'] - 1.0)
            new_risk = self.risk_engine.predict_risk(new_data)
            scenarios.append({
                "name": "Improve Glycemic Control",
                "change_description": f"Lower HbA1c to {new_data['HbA1c_level']:.1f}",
                "original_risk": original_risk,
                "new_risk": new_risk,
                "risk_reduction": original_risk - new_risk
            })
            
        # Scenario 3: Quit Smoking (if smoker)
        if patient_data.get('smoking_history') in ['current', 'ever']:
            new_data = copy.deepcopy(patient_data)
            new_data['smoking_history'] = 'never'
            new_risk = self.risk_engine.predict_risk(new_data)
            scenarios.append({
                "name": "Quit Smoking",
                "change_description": "Change status to 'Never'",
                "original_risk": original_risk,
                "new_risk": new_risk,
                "risk_reduction": original_risk - new_risk
            })

        return scenarios

    def predict_simulation(self, original_data: Dict[str, Any], modifications: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predicts risk for a specific user-defined modification.
        """
        new_data = copy.deepcopy(original_data)
        new_data.update(modifications)
        
        new_risk = self.risk_engine.predict_risk(new_data)
        return {
            "new_risk": new_risk,
            "modified_data": new_data
        }
