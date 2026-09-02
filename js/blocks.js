export const categories={
Primitives:['Code','Cube','Sphere','Cylinder','Cone','Plane','Torus','Grid','Circle','Line','Pyramid','Capsule','Icosphere','Tube','Disc','Box'],
Transforms:['Move','Rotate X','Rotate Y','Rotate Z','Scale','Scale X','Scale Y','Scale Z','Mirror X','Mirror Y','Mirror Z','Apply Transform','Center','Align X','Align Y','Align Z','Snap','Randomize Transform'],
Mesh:['Extrude','Inset','Bevel','Subdivide','Triangulate','Quadrangulate','Flip Faces','Merge Vertices','Weld','Delete Faces','Delete Edges','Delete Vertices','Separate','Merge','Bridge','Fill','Make Planar','Smooth','Flat Shading'],
Faces:['Select Face','Select All Faces','Invert Faces','Grow Selection','Shrink Selection','Extrude Faces','Inset Faces','Scale Faces','Rotate Faces','Move Faces','Bevel Faces','Delete Selected Faces'],
Edges:['Select Edge','Select All Edges','Extrude Edges','Bevel Edges','Split Edges','Dissolve Edges','Subdivide Edges'],
Vertices:['Select Vertex','Select All Vertices','Move Vertices','Scale Vertices','Merge By Distance','Bevel Vertices'],
Math:['Add','Subtract','Multiply','Divide','Power','Square Root','Absolute','Minimum','Maximum','Clamp','Sine','Cosine','Tangent','Round','Floor','Ceil','Random'],
Logic:['If','Equals','Not Equals','Greater','Less','And','Or','Not','Loop','Repeat','For Each','Stop','Wait'],
Scene:['Create Object','Delete Object','Duplicate Object','Rename','Parent','Unparent','Set Origin','Create Collection','Set Active','Camera','Light','World'],
Material:['Material','Set Color','Metallic','Roughness','Emission','Opacity','Smooth','Assign Material'],
Data:['Number','Vector','String','Boolean','Variable','Set Variable','Get Variable','List','Get Item','Set Item','Combine Vector','Split Vector'],
Modifiers:['Array','Mirror','Solidify','Subdivision','Bevel Modifier','Boolean Union','Boolean Difference','Boolean Intersect','Decimate'],
Output:['Preview','Set Object','Export OBJ','Export JSON','Save Project','Print Stats']};
export const allBlocks=Object.entries(categories).flatMap(([category,names])=>names.map(name=>({name,category})));