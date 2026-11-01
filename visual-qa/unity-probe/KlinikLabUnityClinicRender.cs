// SR1I source-pinned WHOLE CLINIC RENDER PROTOTYPE (not complete app).
// Run only in a separate fresh Unity Editor project with a real graphics device.
// No game/window foreground activation; native pixels come from Camera.Render
// -> RenderTexture -> ReadPixels, never a manual screenshot/F12.
using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Security.Cryptography;
using System.Threading;
using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine.Rendering;

public static class KlinikLabUnityClinicRender
{
    const string SOURCE_SHA="f4d4d4151851a08342def08d9f2e461f5f5e7109";
    const int WIDTH=1600, HEIGHT=900;
    const int ORBIT_SECONDS=40;
    static readonly Color BG=new Color(.075f,.11f,.16f);
    static readonly Color STEEL=new Color(.40f,.49f,.55f);
    static readonly Color CERAMIC=new Color(.83f,.86f,.84f);
    static readonly Color BLUE=new Color(.19f,.38f,.55f);
    static readonly Color DARK=new Color(.12f,.16f,.22f);
    static readonly Color TEAL=new Color(.23f,.58f,.59f);
    [Serializable] class ClinicReport
    {
        public int schemaVersion=1;
        public string status="INCOMPLETE";
        public string originalSourceSHA=SOURCE_SHA;
        public string engine="Unity Editor";
        public string unityVersion;
        public string graphicsDeviceName;
        public string graphicsDeviceVendor;
        public string graphicsDeviceType;
        public int graphicsDeviceVendorID;
        public int nativeUnityPid;
        public int beforeTriangles;
        public int cutTriangles;
        public int caseCount;
        public int stationCount;
        public int nativeSceneObjectCount;
        public int orbitRenderFrames;
        public int elapsedSeconds;
        public int width=WIDTH;
        public int height=HEIGHT;
        public string sceneFile;
        public string overviewImage;
        public string angledImage;
        public string occlusalImage;
        public string overviewSHA256;
        public string angledSHA256;
        public string occlusalSHA256;
        public bool originalSourceHashVerified=false;
        public bool sourceCasesStationsVerified=false;
        public bool graphicsDevicePresent=false;
        public bool screenshotsCreated=false;
        public bool privateDesktopConfirmedByLauncher=false;
        public bool independentProcessGpuCorroborated=false;
        public bool imageIndependentlyReviewed=false;
        public bool fullKlinikLabApplicationMigrated=false;
        public bool clinicalAccuracyVerified=false;
        public bool questVerified=false;
        public bool userForegroundActivationRequested=false;
        public string limitation="Whole schematic operatory and training stations, NOT full browser application, clinical simulator, Quest or verified GPU attribution";
    }
    [Serializable] class NativeCases
    {
        public string sourceGitSHA;
        public string kind;
        public int caseCount;
        public int stationCount;
        public bool syntheticCasesOnly;
        public bool clinicalAssessmentValidated;
        public CaseInfo[] cases;
        public StationInfo[] stations;
    }
    [Serializable] class CaseInfo {public string id,fdi,title;}
    [Serializable] class StationInfo {public string id,title;}
    static string Arg(string name)
    {
        var args=Environment.GetCommandLineArgs();
        for(int i=0;i<args.Length-1;i++) if(args[i]==name) return args[i+1];
        throw new InvalidOperationException("Missing mandatory "+name);
    }
    static void Require(bool ok,string message)
    {
        if(!ok) throw new InvalidOperationException("UNITY_CLINIC_PROVENANCE_FAILED: "+message);
    }
    static string Hash(string file)
    {
        using(var sha=SHA256.Create())
        using(var stream=File.OpenRead(file))
            return BitConverter.ToString(sha.ComputeHash(stream)).Replace("-","").ToLowerInvariant();
    }
    static GameObject Box(Transform parent,string name,Vector3 size,Vector3 at,Color color)
    {
        var go=GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name=name;go.transform.SetParent(parent,false);
        go.transform.localPosition=at;go.transform.localScale=size;
        var mat=new Material(Shader.Find("Standard"));
        mat.color=color;
        go.GetComponent<Renderer>().sharedMaterial=mat;
        return go;
    }
    static GameObject Cylinder(Transform parent,string name,Vector3 size,Vector3 at,Color color)
    {
        var go=GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        go.name=name;go.transform.SetParent(parent,false);
        go.transform.localScale=size;go.transform.localPosition=at;
        var mat=new Material(Shader.Find("Standard"));
        mat.color=color;
        go.GetComponent<Renderer>().sharedMaterial=mat;
        return go;
    }
    static TextMesh Label(Transform parent,string name,string text,Vector3 at,float characterSize,Color color)
    {
        var go=new GameObject(name);
        go.transform.SetParent(parent,false);
        go.transform.localPosition=at;
        var t=go.AddComponent<TextMesh>();
        t.text=text;t.characterSize=characterSize;t.fontSize=36;
        t.color=color;t.anchor=TextAnchor.MiddleCenter;
        return t;
    }
    static int Triangles(GameObject go)
    {
        int total=0;
        foreach(var m in go.GetComponentsInChildren<MeshFilter>(true))
        {
            Require(m.sharedMesh!=null,"null Unity imported source mesh");
            for(int sub=0;sub<m.sharedMesh.subMeshCount;sub++)
            {
                Require(m.sharedMesh.GetTopology(sub)==MeshTopology.Triangles,"source triangle topology altered");
                total+=(int)m.sharedMesh.GetIndexCount(sub)/3;
            }
        }
        return total;
    }
    static void CreateRoom(Transform root)
    {
        Box(root,"KL_ROOM_FLOOR",new Vector3(29,.2f,21),new Vector3(0,-3.65f,-1),new Color(.19f,.24f,.28f));
        Box(root,"KL_ROOM_BACK_WALL",new Vector3(29,11,.2f),new Vector3(0,1.8f,9.1f),new Color(.14f,.19f,.24f));
        Box(root,"KL_CLINIC_WALL_BAND",new Vector3(29,.13f,.24f),new Vector3(0,2.95f,9.0f),TEAL);
        Box(root,"KL_LEFT_CABINET",new Vector3(3.3f,2,2.3f),new Vector3(-11.3f,-2.5f,6.0f),CERAMIC);
        Box(root,"KL_RIGHT_CABINET",new Vector3(3.4f,2,2),new Vector3(11.2f,-2.5f,6),CERAMIC);
        Box(root,"KL_CLINIC_SCREEN_FRAME",new Vector3(9,4.6f,.23f),new Vector3(0,1.65f,8.91f),STEEL);
        Box(root,"KL_CLINIC_SCREEN_PANEL",new Vector3(8.7f,4.3f,.11f),new Vector3(0,1.65f,8.77f),BG);
        // Text plane is front-facing to clinic camera from the negative-Z side.
        Label(root,"KL_SCREEN_TITLE","KLINIKLAB / UNITY NATIVE CLINIC",new Vector3(0,2.9f,8.69f),.28f,CERAMIC);
        Label(root,"KL_SCREEN_SUBTITLE","FDI16 before / simulated preparation",new Vector3(0,1.98f,8.69f),.23f,TEAL);
        Label(root,"KL_SCREEN_SCOPE","SCHEMATIC WORKSPACE, NOT COMPLETE APPLICATION",new Vector3(0,.9f,8.69f),.16f,CERAMIC);
    }
    static void CreateChair(Transform root)
    {
        const float x=8.7f;
        Cylinder(root,"KL_DENTAL_CHAIR_PEDESTAL",new Vector3(.5f,.85f,.5f),new Vector3(x,-2.7f,3.2f),STEEL);
        Box(root,"KL_DENTAL_CHAIR_SEAT",new Vector3(2.7f,.48f,3.9f),new Vector3(x,-1.65f,3.6f),BLUE);
        var back=Box(root,"KL_DENTAL_CHAIR_BACK",new Vector3(2.7f,.42f,3.2f),new Vector3(x,-.4f,5.2f),BLUE);
        back.transform.localRotation=Quaternion.Euler(58,0,0);
        Box(root,"KL_DENTAL_CHAIR_HEADREST",new Vector3(1.5f,.3f,.75f),new Vector3(x,.88f,6.3f),DARK);
        foreach(float side in new[]{-1.55f,1.55f})
            Box(root,"KL_CHAIR_ARMREST_"+side,new Vector3(.22f,.23f,2.5f),new Vector3(x+side,-1.15f,3.3f),STEEL);
        Cylinder(root,"KL_LIGHT_POST",new Vector3(.1f,3.9f,.1f),new Vector3(11.5f,.2f,3),STEEL);
        Box(root,"KL_LIGHT_ARM",new Vector3(3.1f,.16f,.16f),new Vector3(9.9f,3.9f,3),STEEL);
        Box(root,"KL_LIGHT_DIFFUSER",new Vector3(1.7f,.22f,1),new Vector3(8.45f,3.6f,3),CERAMIC);
        var lamp=new GameObject("KL_NATIVE_PROCEDURE_LAMP");
        lamp.transform.SetParent(root,false);
        lamp.transform.localPosition=new Vector3(8.45f,3.4f,3);
        lamp.transform.localRotation=Quaternion.Euler(90,0,0);
        var spot=lamp.AddComponent<Light>();spot.type=LightType.Spot;spot.range=12;spot.intensity=3.2f;
    }
    static void CreateInstruments(Transform root)
    {
        const float x=-8.8f;
        Cylinder(root,"KL_INSTRUMENT_CART_PILLAR",new Vector3(.17f,1,.17f),new Vector3(x,-2.65f,3),STEEL);
        Box(root,"KL_INSTRUMENT_TRAY",new Vector3(4,.16f,2.4f),new Vector3(x,-1.60f,3),CERAMIC);
        Box(root,"KL_INSTRUMENT_TRAY_RIM",new Vector3(4.2f,.07f,2.5f),new Vector3(x,-1.46f,3),STEEL);
        string[] tools={"mirror","explorer","bur","syringe","composite"};
        for(int i=0;i<tools.Length;i++)
        {
            var tool=Cylinder(root,"KL_TOOL_"+tools[i],new Vector3(.07f,.57f,.07f),
                new Vector3(x-1.55f+i*.77f,-1.25f,3),STEEL);
            tool.transform.localRotation=Quaternion.Euler(90,0,0);
            Label(root,"KL_TOOL_LABEL_"+tools[i],tools[i],
                new Vector3(x-1.55f+i*.77f,-1.17f,1.5f),.10f,CERAMIC);
        }
    }
    static void CreateSpecimens(Transform root)
    {
        for(int i=0;i<2;i++)
        {
            float x=i==0?-2.9f:2.9f;
            Box(root,"KL_SPECIMEN_PODIUM_"+i,new Vector3(4.6f,.34f,4.6f),
                new Vector3(x,-3.16f,-.2f),DARK);
            Box(root,"KL_PODIUM_RIM_"+i,new Vector3(4.7f,.08f,4.7f),
                new Vector3(x,-2.95f,-.2f),STEEL);
            Label(root,"KL_CASE_LABEL_"+i,i==0?"FDI16 BEFORE":"FDI16 CUT",
                new Vector3(x,-2.48f,-2.5f),.2f,CERAMIC);
        }
    }
    static void CreateCaseStations(Transform root,NativeCases data)
    {
        for(int i=0;i<data.cases.Length;i++)
        {
            string label="FDI "+data.cases[i].fdi+"  "+data.cases[i].id.ToUpperInvariant();
            float x=-11.6f+(i%3)*1.6f;
            float y=1.75f-(i/3)*.6f;
            Label(root,"KL_CASE_METADATA_"+data.cases[i].id,label,new Vector3(x,y,8.61f),.13f,CERAMIC);
        }
        for(int i=0;i<data.stations.Length;i++)
        {
            float x=-5.8f+i*1.9f;
            Box(root,"KL_TRAINING_STATION_"+data.stations[i].id,
                new Vector3(1.6f,.13f,1),new Vector3(x,-3.5f,-7.3f),TEAL);
            Label(root,"KL_STATION_LABEL_"+data.stations[i].id,
                data.stations[i].id.ToUpperInvariant(),new Vector3(x,-3.05f,-7.1f),.13f,CERAMIC);
        }
    }
    static void AddLight(Transform root,string name,Vector3 at,float intensity)
    {
        var go=new GameObject(name);go.transform.SetParent(root,false);
        go.transform.localPosition=at;go.transform.localRotation=Quaternion.Euler(55,22,0);
        var light=go.AddComponent<Light>();
        light.type=LightType.Directional;light.intensity=intensity;
    }
    static string Capture(Camera cam,string path)
    {
        Require(!File.Exists(path),"original pixel file already exists: "+path);
        var tex=new RenderTexture(WIDTH,HEIGHT,24,RenderTextureFormat.ARGB32);
        tex.Create();
        Require(tex.IsCreated(),"GPU RenderTexture creation failed");
        var prev=RenderTexture.active;
        var oldTarget=cam.targetTexture;
        try
        {
            cam.targetTexture=tex;
            cam.Render();
            RenderTexture.active=tex;
            var result=new Texture2D(WIDTH,HEIGHT,TextureFormat.RGB24,false);
            try
            {
                result.ReadPixels(new Rect(0,0,WIDTH,HEIGHT),0,0,false);
                result.Apply(false,false);
                byte[] png=result.EncodeToPNG();
                Require(png!=null && png.Length>25000,"native pixel capture unexpectedly blank/tiny");
                using(var stream=new FileStream(path,FileMode.CreateNew,FileAccess.Write))
                    stream.Write(png,0,png.Length);
            }
            finally {UnityEngine.Object.DestroyImmediate(result);}
        }
        finally
        {
            cam.targetTexture=oldTarget;
            RenderTexture.active=prev;
            tex.Release();
            UnityEngine.Object.DestroyImmediate(tex);
        }
        return Hash(path);
    }
    static void View(Camera cam,Vector3 at,Vector3 look,float fov)
    {
        cam.orthographic=false;
        cam.fieldOfView=fov;
        cam.transform.position=at;
        cam.transform.LookAt(look);
    }
    public static void Run()
    {
        string output=Path.GetFullPath(Arg("-klCaptureDir"));
        string resultFile=Path.GetFullPath(Arg("-klClinicResult"));
        string dataFile=Path.GetFullPath(Arg("-klCaseManifest"));
        Require(!File.Exists(resultFile),"refusing reuse of a previous clinic report");
        Require(Directory.Exists(output),"unique capture output directory missing");
        Require(SystemInfo.graphicsDeviceType!=GraphicsDeviceType.Null,
            "Unity launched with null graphics device / -nographics; real GPU rendering required");
        string dataText=File.ReadAllText(dataFile);
        var data=JsonUtility.FromJson<NativeCases>(dataText);
        string[] ids={"molar","endo","anterior","crown","surgery","perio"};
        string[] teeth={"16","36","11","26","48","46"};
        string[] stations={"interview","letter","handover","written","practical","viva","clinic"};
        Require(data!=null && data.sourceGitSHA==SOURCE_SHA &&
            data.kind=="PRODUCTION_CASE_AND_STATION_METADATA_NOT_FULL_APP" &&
            data.caseCount==6 && data.stationCount==7 &&
            data.cases!=null && data.cases.Length==6 &&
            data.stations!=null && data.stations.Length==7 &&
            data.syntheticCasesOnly && !data.clinicalAssessmentValidated,
            "original source case/station metadata not verified");
        for(int i=0;i<6;i++)
            Require(data.cases[i].id==ids[i] && data.cases[i].fdi==teeth[i],"case identity/FDI mismatch");
        for(int i=0;i<7;i++)
            Require(data.stations[i].id==stations[i],"station identity mismatch");
        var scene=EditorSceneManager.OpenScene("Assets/Scenes/KlinikLab_FDI16_SourcePreview.unity",
            OpenSceneMode.Single);
        var originalBefore=GameObject.Find("FDI16_BEFORE");
        var originalAfter=GameObject.Find("FDI16_AFTER_SIMULATED_CUT");
        Require(originalBefore!=null && originalAfter!=null,"source-fidelity FDI16 pair missing");
        int before=Triangles(originalBefore),after=Triangles(originalAfter);
        Require(before==14856 && after==14936,"original source triangle parity lost");
        var root=new GameObject("KL_UNITY_WHOLE_CLINIC_WORKSPACE_PROTOTYPE");
        CreateRoom(root.transform);
        CreateChair(root.transform);
        CreateInstruments(root.transform);
        CreateSpecimens(root.transform);
        CreateCaseStations(root.transform,data);
        AddLight(root.transform,"KL_AREA_LIGHT",new Vector3(2,8,0),1.35f);
        var camera=Camera.main;
        Require(camera!=null,"original Unity source scene lacks main camera");
        camera.clearFlags=CameraClearFlags.SolidColor;
        camera.backgroundColor=BG;
        camera.nearClipPlane=.1f;
        camera.farClipPlane=150f;
        camera.allowHDR=false;
        camera.aspect=(float)WIDTH/HEIGHT;
        string scenePath="Assets/Scenes/KlinikLab_WholeClinic_Prototype.unity";
        Require(EditorSceneManager.SaveScene(scene,scenePath,true),"Unity whole clinic scene save failed");
        var report=new ClinicReport{
            unityVersion=Application.unityVersion,
            graphicsDeviceName=SystemInfo.graphicsDeviceName,
            graphicsDeviceVendor=SystemInfo.graphicsDeviceVendor,
            graphicsDeviceVendorID=SystemInfo.graphicsDeviceVendorID,
            graphicsDeviceType=SystemInfo.graphicsDeviceType.ToString(),
            nativeUnityPid=System.Diagnostics.Process.GetCurrentProcess().Id,
            beforeTriangles=before,cutTriangles=after,caseCount=6,stationCount=7,
            nativeSceneObjectCount=root.transform.childCount,
            sceneFile=scenePath,sourceCasesStationsVerified=true,originalSourceHashVerified=true,
            graphicsDevicePresent=true
        };
        string overview=Path.Combine(output,"unity-whole-clinic-overview.png");
        string angled=Path.Combine(output,"unity-whole-clinic-angled.png");
        string occlusal=Path.Combine(output,"unity-fdi16-cut-occlusal.png");
        View(camera,new Vector3(0,7,-20),new Vector3(0,-.1f,0),56);
        report.overviewSHA256=Capture(camera,overview);report.overviewImage=Path.GetFileName(overview);
        // Maintain a non-headless, real device and a slowly evolving camera
        // for independently sampled 1 Hz Windows PDH GPU Engine collection.
        var start=DateTime.UtcNow;
        for(int i=0;i<ORBIT_SECONDS;i++)
        {
            float a=-.22f+.44f*(i/(float)(ORBIT_SECONDS-1));
            View(camera,new Vector3(20f*Mathf.Sin(a),7, -20f*Mathf.Cos(a)),
                new Vector3(0,-.1f,0),56);
            camera.Render();
            report.orbitRenderFrames++;
            Thread.Sleep(1000);
        }
        report.elapsedSeconds=(int)(DateTime.UtcNow-start).TotalSeconds;
        View(camera,new Vector3(9,12,-13),new Vector3(0,-1,0),56);
        report.angledSHA256=Capture(camera,angled);report.angledImage=Path.GetFileName(angled);
        View(camera,new Vector3(1.4f,4.8f,-5.2f),new Vector3(2.9f,-1.45f,-.2f),30);
        report.occlusalSHA256=Capture(camera,occlusal);report.occlusalImage=Path.GetFileName(occlusal);
        report.screenshotsCreated=true;
        report.status="UNITY_NATIVE_WHOLE_CLINIC_PIXELS_GPU_ATTRIBUTION_PENDING";
        File.WriteAllText(resultFile,JsonUtility.ToJson(report,true),new UTF8Encoding(false));
        Debug.Log("KL_UNITY_CLINIC_NATIVE_PIXELS_WRITTEN attribution pending, no full-app acceptance: "+resultFile);
    }
}
