# Setting up several sources in the demo

A new workspace starts empty. The admin selects one or more document sources,
then signs in to each selected service or adds files. Each source keeps its own
selection of spaces and checking frequency when the admin goes back a step.
Removing a selection leaves its draft available if it is selected again.

Continue is available only after every selected service is connected, uploads
have files, and each service includes at least one space. The review lists each
source separately, including who signed in and what will be read. It repeats
that existing access is respected, and warns that uploads are workspace-wide.

Adding starts a separate simulated reading job for each source. All sources are
saved together, survive reloads, and appear in Connectors. No real sign-in,
external connector or backend is added. Already connected services remain
unavailable; uploaded files can be added again.
