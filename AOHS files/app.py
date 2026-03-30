
import streamlit as st
import pandas as pd
import os
from datetime import date
import plotly.express as px

# --- Configuration ---
LOG_FILE = 'heavy_equipment_inspections.csv'
inspection_checklists = {
    'Forklift': [
        'Horn operation', 'Steering responsiveness', 'Braking system (service and parking)',
        'Fluid levels (oil, fuel, coolant, hydraulic)', 'Fork condition (cracks, bends, wear)',
        'Mast and chain condition', 'Tire condition and pressure', 'Lights and alarms'
    ],
    'Crane': [
        'Wire rope condition (broken wires, kinking, wear)', 'Hook latches and condition',
        'Limit switches operation', 'Load testing indicators and load charts',
        'Hydraulic or mechanical control function', 'Outriggers or stabilizers',
        'Drum and sheave condition'
    ],
    'Shackle': [
        'Pin wear and condition', 'Body deformation (twisting or stretching)',
        'Legible markings (WLL and manufacturer ID)', 'Cracks or nicks',
        'Proper pin seating and engagement'
    ]
}

# --- App Setup ---
st.set_page_config(page_title="Heavy Equipment Inspection System", layout="wide")
st.title("⚙️ Heavy Equipment Inspection System")

tab1, tab2 = st.tabs(["Daily Inspection Form", "Analytics Dashboard"])

# --- Tab 1: Inspection Form ---
with tab1:
    st.header("Safety Check Entry")

    # Metadata
    col_meta1, col_meta2 = st.columns(2)
    with col_meta1:
        equipment_type = st.selectbox("Equipment Type", list(inspection_checklists.keys()))
        inspector = st.text_input("Inspector Name")
    with col_meta2:
        equip_id = st.text_input("Equipment ID")
        entry_date = st.date_input("Date", value=date.today())

    st.divider()
    st.subheader(f"{equipment_type} Checklist Items")

    # Dynamic Checklist
    items = inspection_checklists[equipment_type]
    responses = {}
    col_chk1, col_chk2 = st.columns(2)
    
    for i, item in enumerate(items):
        current_col = col_chk1 if i % 2 == 0 else col_chk2
        responses[item] = current_col.selectbox(
            item, options=['Pass', 'Fail', 'N/A'], key=f"{equipment_type}_{item}"
        )

    # Submission Logic
    if st.button("Submit Inspection", type="primary"):
        if not inspector or not equip_id:
            st.error("Inspector Name and Equipment ID are required.")
        else:
            new_record = {
                'Date': str(entry_date),
                'Inspector': inspector,
                'Equipment_Type': equipment_type,
                'Equipment_ID': equip_id
            }
            new_record.update(responses)
            df_new = pd.DataFrame([new_record])

            # Save to CSV
            if not os.path.isfile(LOG_FILE):
                df_new.to_csv(LOG_FILE, index=False)
            else:
                df_new.to_csv(LOG_FILE, mode='a', header=False, index=False)

            st.success("Inspection logged successfully!")

            # Alerts
            failed_items = [k for k, v in responses.items() if v == 'Fail']
            if failed_items:
                st.warning(f"⚠️ MAINTENANCE ALERT: Critical items failed: {', '.join(failed_items)}")
            else:
                st.info("✅ Equipment passed all safety checks.")

# --- Tab 2: Dashboard ---
with tab2:
    st.header("Performance & Compliance Analytics")

    if not os.path.exists(LOG_FILE):
        st.info("No data logged yet. Please submit an inspection record to view analytics.")
    else:
        df = pd.read_csv(LOG_FILE)
        df['Date'] = pd.to_datetime(df['Date'])

        # Chart 1: Volume
        st.subheader("Inspection Volume Trends")
        trend_df = df.groupby(df['Date'].dt.date).size().reset_index(name='Daily Inspections')
        fig_line = px.line(trend_df, x='Date', y='Daily Inspections', markers=True,
                          title="Daily Inspection Count")
        st.plotly_chart(fig_line, use_container_width=True)

        # Chart 2: Status
        st.subheader("Health Status Overview")
        meta_cols = ['Date', 'Inspector', 'Equipment_Type', 'Equipment_ID']
        checklist_cols = [c for c in df.columns if c not in meta_cols]
        
        melted_df = df.melt(id_vars=['Equipment_Type'], value_vars=checklist_cols, value_name='Status')
        fig_bar = px.histogram(melted_df, x='Equipment_Type', color='Status', barmode='group',
                              title="Status Counts by Equipment Type",
                              color_discrete_map={'Pass': 'green', 'Fail': 'red', 'N/A': 'gray'})
        st.plotly_chart(fig_bar, use_container_width=True)
