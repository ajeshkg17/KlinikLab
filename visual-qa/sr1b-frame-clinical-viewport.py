"""Run ONLY inside an already open native Unreal 5.8.4 Editor Python Console.

Frames two saved original-source FDI16 procedural tooth actors instead of
editor sprites. This does NOT capture pixels and never proves GPU utilization.
"""
import unreal

expected={
    'KL_FDI16_BEFORE_SOURCE_MESH',
    'KL_FDI16_AFTER_SIMULATED_CUT_SOURCE_MESH'
}
actor_editor=unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
actors=list(actor_editor.get_all_level_actors())
found={a.get_actor_label():a for a in actors if a.get_actor_label() in expected}
if set(found)!=expected:
    raise RuntimeError('SR1B camera setup found no exact two tooth actors: '+repr(sorted(found)))
for label,actor in found.items():
    parts=list(actor.get_components_by_class(unreal.ProceduralMeshComponent))
    if len(parts)!=5:
        raise RuntimeError('SR1B expected five original tissue components: '+label)
    for part in parts:
        center,half,radius=unreal.SystemLibrary.get_component_bounds(part)
        if radius<=0.01 or not part.is_visible() or part.get_num_sections()!=1:
            raise RuntimeError('SR1B tooth native component has zero bounds/hidden section: '+label+'/'+part.get_name())

level=unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
key=level.get_active_viewport_config_key()
level.set_level_viewport_camera_info(
    unreal.Vector(-150.0,0.0,106.0),
    unreal.Rotator(-12.0,0.0,0.0),key)
level.set_level_viewport_fov(73.0,key)
level.editor_set_game_view(True,key)
level.editor_set_viewport_realtime(True,key)
level.editor_invalidate_viewports()
unreal.log('SR1B Native clinical viewport framed before+after source FDI16; game-view hides editor billboards. Capture real HighResShot now; do not assume geometry is visible without pixel inspection.')
