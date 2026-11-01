// SOURCE-ONLY Unity Editor experiment. This is NOT a GPU render,
// dental anatomy validation, production app migration or Quest build.
// Only deterministic FDI16 browser ToothSolid/VoxelMesher OBJ exports.
using System;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Security.Cryptography;
using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine.SceneManagement;

public static class KlinikLabUnitySourceProbe
{
    [Serializable] sealed class MaterialCounts
    {
        public int enamel, dentin, pulp, cementum, caries;
        public int Total => enamel + dentin + pulp + cementum + caries;
        public bool AllPositive => enamel>0 && dentin>0 && pulp>0 && cementum>0 && caries>0;
    }
    [Serializable] sealed class MeshState
    {
        public int triangles;
        public MaterialCounts byMaterial;
    }
    [Serializable] sealed class SceneStates
    {
        public MeshState before;
        public MeshState after;
    }
    [Serializable] sealed class ExportManifest
    {
        public string sourceGitSHA;
        public string fdi;
        public string procedure;
        public bool clinicalAccuracyVerified;
        public SceneStates sceneStates;
    }
    [Serializable] sealed class Report
    {
        public int schemaVersion = 1;
        public string status;
        public string unityVersion;
        public string sourceGitSHA;
        public string scenePath;
        public int sourceBeforeTriangles;
        public int sourceAfterTriangles;
        public int importedBeforeTriangles;
        public int importedAfterTriangles;
        public bool sourceHashVerified;
        public bool privateDesktopRendered = false;
        public bool processGpuVerified = false;
        public bool screenshotReviewed = false;
        public bool fullKlinikLabApplicationMigrated = false;
        public bool clinicalAccuracyVerified = false;
        public string note = "Unity Editor batchmode -nographics: source/scene preparation ONLY";
    }
    static string Argument(string key)
    {
        string[] args=Environment.GetCommandLineArgs();
        for(int i=0;i<args.Length-1;i++)
            if(args[i]==key) return args[i+1];
        throw new InvalidOperationException("Missing mandatory argument "+key);
    }
    static void Check(bool ok,string what)
    {
        if(!ok) throw new InvalidOperationException("KlinikLab Unity provenance: "+what);
    }
    static string FileHash(string filepath)
    {
        using(var sha=SHA256.Create())
        using(var stream=File.OpenRead(filepath))
        {
            var bytes=sha.ComputeHash(stream);
            var hex=new StringBuilder(bytes.Length*2);
            foreach(byte b in bytes) hex.Append(b.ToString("x2"));
            return hex.ToString();
        }
    }
    static string ExpectedHash(string json,string file)
    {
        var pattern="\"" + Regex.Escape(file) + "\"\\s*:\\s*\"([a-f0-9]{64})\"";
        Match match=Regex.Match(json,pattern,CultureInvariantOptions);
        Check(match.Success,"source manifest missing checksum for "+file);
        return match.Groups[1].Value;
    }
    const RegexOptions CultureInvariantOptions=RegexOptions.CultureInvariant;
    static int TriangleCount(GameObject model)
    {
        int count=0;
        foreach(var filter in model.GetComponentsInChildren<MeshFilter>(true))
        {
            Check(filter.sharedMesh!=null,"imported mesh is null");
            var mesh=filter.sharedMesh;
            for(int sub=0;sub<mesh.subMeshCount;sub++)
            {
                Check(mesh.GetTopology(sub)==MeshTopology.Triangles,"nontriangle OBJ submesh");
                count += (int)mesh.GetIndexCount(sub)/3;
            }
        }
        return count;
    }
    static GameObject AddNativeModel(string assetPath,string name,Vector3 position)
    {
        var imported=AssetDatabase.LoadAssetAtPath<GameObject>(assetPath);
        Check(imported!=null,"Unity native OBJ importer unavailable: "+assetPath);
        var obj=PrefabUtility.InstantiatePrefab(imported) as GameObject;
        Check(obj!=null,"Failed to instantiate original source: "+assetPath);
        obj.name=name;
        obj.transform.position=position;
        // Source OBJ is Unreal-display Z-up (x,z,y), and swaps face winding.
        // Z reflection + X 90-degree rotation restores original browser Y-up.
        obj.transform.rotation=Quaternion.Euler(90f,0f,0f);
        obj.transform.localScale=new Vector3(0.1f,0.1f,-0.1f);
        return obj;
    }
    public static void Run()
    {
        string source=Path.GetFullPath(Argument("-klSourceDir"));
        string reportPath=Path.GetFullPath(Argument("-klResult"));
        string sha=Argument("-klExpectedSha");
        Check(Regex.IsMatch(sha,"^[a-f0-9]{40}$"),"40-char exact source SHA required");
        Check(!File.Exists(reportPath),"refusing overwrite of existing Unity result");
        string json=File.ReadAllText(Path.Combine(source,"kliniklab-export-manifest.json"));
        var manifest=JsonUtility.FromJson<ExportManifest>(json);
        Check(manifest!=null && manifest.sourceGitSHA==sha && manifest.fdi=="16" &&
              manifest.procedure=="restoration" && manifest.clinicalAccuracyVerified==false,
              "wrong original educational FDI16 source manifest");
        Check(manifest.sceneStates!=null && manifest.sceneStates.before!=null &&
              manifest.sceneStates.after!=null,"missing source state");
        Check(manifest.sceneStates.before.triangles==14856 &&
              manifest.sceneStates.after.triangles==14936,"source topology parity");
        Check(manifest.sceneStates.before.byMaterial!=null &&
              manifest.sceneStates.after.byMaterial!=null &&
              manifest.sceneStates.before.byMaterial.AllPositive &&
              manifest.sceneStates.after.byMaterial.AllPositive &&
              manifest.sceneStates.before.byMaterial.Total==14856 &&
              manifest.sceneStates.after.byMaterial.Total==14936,
              "five source material groups must retain exact triangle parity");

        string[] filenames={"fdi16-before.obj","fdi16-after-cut.obj","kliniklab-fdi16.mtl"};
        string assetRoot=Path.Combine(Application.dataPath,"Source");
        Directory.CreateDirectory(assetRoot);
        foreach(string file in filenames)
        {
            string src=Path.Combine(source,file);
            Check(File.Exists(src),"missing native source "+file);
            Check(FileHash(src)==ExpectedHash(json,file),"source SHA256 mismatch "+file);
            string target=Path.Combine(assetRoot,file);
            Check(!File.Exists(target),"refusing overwrite of original imported OBJ "+target);
            File.Copy(src,target);
        }
        AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
        Scene scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
        var left=AddNativeModel("Assets/Source/fdi16-before.obj","FDI16_BEFORE",-Vector3.right*3.2f);
        var right=AddNativeModel("Assets/Source/fdi16-after-cut.obj","FDI16_AFTER_SIMULATED_CUT",Vector3.right*3.2f);
        int before=TriangleCount(left), after=TriangleCount(right);
        Check(before==14856 && after==14936,
              "Unity-imported source topology differs from browser source; before="+before+" after="+after);
        var lightObj=new GameObject("DirectionalLight");
        var light=lightObj.AddComponent<Light>();
        light.type=LightType.Directional;
        light.intensity=1.3f;
        lightObj.transform.rotation=Quaternion.Euler(38,-22,0);
        var cameraObj=new GameObject("Main Camera");
        cameraObj.tag="MainCamera";
        var camera=cameraObj.AddComponent<Camera>();
        camera.orthographic=true;
        camera.orthographicSize=6f;
        cameraObj.transform.position=new Vector3(0,5,-15);
        cameraObj.transform.LookAt(new Vector3(0,1.1f,0));
        Directory.CreateDirectory(Path.Combine(Application.dataPath,"Scenes"));
        string scenePath="Assets/Scenes/KlinikLab_FDI16_SourcePreview.unity";
        Check(EditorSceneManager.SaveScene(scene,scenePath,false),"scene save failed");
        var result=new Report {
            status="UNITY_SOURCE_IMPORTED_SCENE_SAVED_NO_GPU_RENDER",
            unityVersion=Application.unityVersion,sourceGitSHA=sha,scenePath=scenePath,
            sourceBeforeTriangles=14856,sourceAfterTriangles=14936,
            importedBeforeTriangles=before,importedAfterTriangles=after,sourceHashVerified=true
        };
        File.WriteAllText(reportPath,JsonUtility.ToJson(result,true),new UTF8Encoding(false));
        Debug.Log("KLINIKLAB_UNITY_SOURCE_IMPORT_OK_NO_GPU_RENDER "+reportPath);
    }
}
