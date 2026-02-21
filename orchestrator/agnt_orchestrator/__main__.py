"""Entry point: python -m agnt_orchestrator <prompt>"""

import sys

from agnt_orchestrator import Claude, Codex

GROOMER_INSTRUCTIONS = """
Update CLAUDE.md to reflect the plan attached below.                                        
   
  ## Instructions                                                                             
                                                            
  Your only job is to update CLAUDE.md — do not write any code.                               
                                                            
  1. Read `CLAUDE.md` fully.
  2. Read the plan attached below.
  3. Update the **Current Task** section:
     - Replace it with a one-liner summary of what the plan describes.
     - Keep it concise — this is a single commit's worth of work.
  4. Groom the **Backlog** section:
     - If the current plan covers an existing backlog item, mark it `← current`.
     - Remove the `← current` marker from any other item.
     - If the plan spans multiple backlog items, combine them into one or clarify which is
  active.
     - If the plan introduces work not yet in the backlog, add it in the right position.
     - Check off (`[x]`) any items that are already done based on the codebase/git history.
     - Reorder if priorities have shifted based on the plan.
  5. Do NOT touch the Roadmap, End Goal, or Instructions sections.
  6. Do NOT create or modify any other files.

  The plan: 
"""

prompt = "Say hi"

claude = Claude()
codex = Codex()

plan = claude.plan(prompt)
claude.execute(GROOMER_INSTRUCTIONS + plan)
codex.execute(f"""You are the executor. Implement the following plan.
               After you are done, 
               commit the changes in one commit \n\n{plan}""")
