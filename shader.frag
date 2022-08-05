#ifdef GL_ES
precision mediump float;
#endif

#define MAX_STEPS 100
#define MAX_DIST 100.0
#define SURF_DIST 0.01
#define PI 3.1415925359

uniform vec2 u_resolution;
uniform float u_time;

float sdPlane(vec3 p) {
    return p.y;
}

float sdSphere(vec3 p, vec4 s) {
    return length(p - s.xyz) - s.w;
}

float sdBox( vec3 p, vec3 b )
{
    vec3 d = abs(p) - b;
    return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0));
}

float sdTorus(vec3 p, vec2 r) {
    float x = length(p.xz) - r.x;
    return length(vec2(x, p.y)) - r.y;
}

float sdCylinder(vec3 p, vec3 a, vec3 b, float r) {
    vec3 ab = b - a;
    vec3 ap = p - a;
    float t = dot(ab, ap) / dot(ab, ab);
    vec3 c = a + t * ab;
    float x = length(p - c) - r;
    float y = (abs(t - 0.5) - 0.5) * length(ab);
    float e = length(max(vec2(x, y), 0.0));
    float i = min(max(x, y), 0.0);
    return e + i;
}

float unionSDF (float sda, float sdb) {
    return min(sda, sdb);
}

float intersectionSDF (float sda, float sdb) {
    return max(sda, sdb);
}

float differenceSDF (float sda, float sdb) {
    return max(-sda, sdb);
}

float blendSDF(float sda, float sdb, float k) {
    float h = clamp(0.5 + 0.5 * (sdb - sda) / k, 0.0, 1.0);
    return mix(sdb, sda, h) - k * h * (1.0 - h);
}

mat2 Rot (float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

vec2 getDist(vec3 p) {
    float planeDist = p.y;
    float s = sin(u_time * 0.01);
    vec3 bp = p - vec3(3, 0.75, 7);
    bp.xz *= Rot(u_time * 0.01);
    vec3 tp = p - vec3(0, 0.5, 6);
    tp.y -= s;
    
    vec3 bp2 = p - vec3(-3, 0.75, 6);
    bp2.y -= -s;
    
    float cx = -3.0;
    cx -= s;
    
    vec3 a = vec3(0, 0.3, 3);
    vec3 b = vec3(3, 0.3, 5);
    vec3 ab = normalize(b - a).zyx;
    ab.x = -ab.x;
    a -= s * ab;
    b -= s * ab;
    
    float sd  = sdSphere(p, vec4(0, 1, 6 , 1));
    float displacement = sin(15.0 * p.x) * sin(10.0 * p.y) * sin(5.0 * p.z) * 0.2;
    sd += displacement;
    float sd2 = sdSphere(p, vec4(-3, 0.5, 6, 1.0));
    float td  = sdTorus (tp, vec2(1.5, 0.3));
    displacement = sin(2.5 * p.x) * sin(5.0 * p.y) * sin(3.0 * p.z) * 0.2;
    float bd  = sdBox(bp, vec3(0.75)) + displacement;
    float bd2 = sdBox(bp2, vec3(0.75));
    float cd  = sdCylinder(p, a, b, 0.3);
    
    float sd3 = sdSphere(p, vec4(cx, 3, 8, 1));
    float sd4 = sdSphere(p, vec4(-2, 3, 8, 1));
    
    float d = min(sd, planeDist);
    d = min(d, td);
    d = min(d, cd);
    d = min(d, bd);
    d = min(differenceSDF(sd2, bd2), d);
    d = min(blendSDF(sd3, sd4, 0.2), d);

    float c = 0.0;
    if (d < sd + 0.001 && d > sd - 0.001) {
        c = 1.0;
    }
    if (d < planeDist + 0.001 && d > planeDist - 0.001) {
        c = 2.0;
    }
    if (d < td + 0.001 && d > td - 0.001) {
        c = 3.0;
    }
    if (d < bd + 0.001 && d > bd - 0.001) {
        c = 4.0;
    }
    if (d < cd + 0.001 && d > cd - 0.001) {
        c = 5.0;
    }
    if (d < blendSDF(sd3, sd4, 0.2) + 0.001 && d > blendSDF(sd3, sd4, 0.2) - 0.001) {
        c = 6.0;
    }
    
    return vec2(d, c);
}

vec2 rayMarch(vec3 ro, vec3 rd) {
	vec2 dO = vec2(0.0, 0.0);
    for (int i = 0; i < MAX_STEPS; i++) {
    	vec3 p = ro + rd * dO.x;
        vec2 dS = getDist(p);
        dO.x += dS.x;
        dO.y = dS.y;
        if(dO.x > MAX_DIST || dS.x < SURF_DIST) break;
    }
    return dO;
}

vec3 normal(vec3 p) {
	float d = getDist(p).x;
    vec2 e = vec2(.01, 0);
    vec3 n = d - vec3(
        getDist(p-e.xyy).x,
        getDist(p-e.yxy).x,
        getDist(p-e.yyx).x);
    return normalize(n);
}

// Phong illumination model, given a point and camera position.
float getLight(vec3 p, vec3 ro) {
    vec3 lightPos = vec3(0, 5, 6);
    lightPos.xz += vec2(sin(u_time * 0.01), cos(u_time * 0.01)) * 2.0;
    
    vec3 l = normalize(lightPos - p);
    vec3 n = normal(p);
    vec3 r = reflect(-l, n);
    // ambient component
    float amb = 0.1;
    // ambient reflection coefficient
    float ka = 1.0;
    // diffuse component - apply Lambert's cosine law
    float dif = clamp(dot(n, l), 0.0, 1.0);
    // diffuse reflection coefficient
    float kd = 0.8;
    // specular component
    float shininess = 250.0;
    vec3 v = normalize(ro - p);
    float spec = clamp(dot(r, v), 0.0, 1.0);
    spec = pow(spec,shininess);
    // specular reflection coefficient
    float ks = 1.0;
    // slightly move point p in the direction of the normal,
    // so the distance is not zero. Otherwise, the first hit 
    // will be at the plane.
    vec2 d = rayMarch(p + 2. * n * SURF_DIST , l);
    // cast a ray to the light
    if (d.x < length(lightPos - p)) {
        // point in the shadow
        dif *= 0.1;
        spec *= 0.5;
    }
    // ambient + diffuse + specular components
    return ka * amb + kd * dif + ks * spec;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - u_resolution.xy) / u_resolution.y;
    vec3 col;
    vec3 ro = vec3(0, 2, 0);
    vec3 rd = normalize(vec3(uv.x, uv.y, 1));
     // Rotate camera down about the x-axis
    rd.yz *= Rot(PI * 10. / 180.); 
    vec2 d = rayMarch(ro, rd);
    vec3 p = ro + rd * d.x;
    float dif = getLight(p, ro);
    // float dif = light(p);
    vec3 background_color = vec3(0.02, 0.02, 0.05);
    vec3 surface_color = vec3(0.6, 0.4, 0.0);
    vec3 blob_color = vec3(0.0, 0.8, 0.1);
    vec3 ground_color = vec3(0.1, 0.05, 0.0);
    vec3 ring_color = vec3(0.8, 0.5, 0.5);
    vec3 box_color = vec3(0.2, 0.0, 0.8);
    vec3 roll_color = vec3(0.6, 0.1, 0.3);
    vec3 dbl_color = vec3(0.3, 0.0, 0.0);
    if (d.x < MAX_DIST && d.y < 0.5) {
        col = surface_color * vec3(dif);
    } else if (d.x < MAX_DIST && d.y < 1.5) {
        col = blob_color * vec3(dif);
    } else if (d.x < MAX_DIST && d.y < 2.5) {
        col = ground_color * vec3(dif);
    } else if (d.x < MAX_DIST && d.y < 3.5) {
        col = ring_color * vec3(dif);
    } else if (d.x < MAX_DIST && d.y < 4.5) {
        col = box_color * vec3(dif);
    } else if (d.x < MAX_DIST && d.y < 5.5) {
        col = roll_color * vec3(dif);
    } else if (d.x < MAX_DIST) {
        col = dbl_color * vec3(dif);
    } else {
        col = background_color;
    } 
    col = pow(col, vec3(.4545));	// gamma correction
    gl_FragColor = vec4(col,1.0);

}