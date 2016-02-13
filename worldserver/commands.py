"""
commands.py interprets commands passed from the world server server thread and translates them into operations on
everett worlds kept in memory
"""

import random
from threading import Thread

import generation
import geography

def json_safe_world(w):
    return {key: value for key, value in w.iteritems() if key in ['properties', 'name', 'geography', 'topography', 'status']}


sample_world = {'properties': { 'foo' : 'bar' }, 'name' : "sample", 'geography' : geography.make_fake_geography(), 'topography': None, 'status' : 'complete'}


def resolve_command(command, global_state_dict, global_lock):
    """
    :param command: a dict constructed from the JSON of the command passed from the world client
    :param global_state_dict: a dict of { id : { properties : [], world : Everett() } }
    :param global_lock: a lock that must be acquired inside any forked threads when making changes to the global dict
    :return: a dict that can be passed to JSON.dumps()
    """

    if 'command' in command:
        if command['command'] == 'create_new_world':
            new_world_id = "{:08x}".format(random.getrandbits(32))
            # t = geography.geography_to_topography(g)
            n = "Sphereland"
            global_lock.acquire()
            global_state_dict[new_world_id] = {'properties': { 'foo' : 'bar' }, 'name' : n, 'geography' : None,
                                               'topography': None, 'status' : 'generating'}
            global_lock.release()
            g_thread = Thread(target=generation.add_world_geography, args=(new_world_id, global_state_dict, global_lock))
            g_thread.start()
            return {'result' : 'success', 'world_id' : new_world_id, 'world' : json_safe_world(global_state_dict[new_world_id])}
        elif command['command'] == 'list_worlds':
            return {'result' : 'success', 'worlds': {world_id: json_safe_world(world) for world_id, world in global_state_dict.iteritems()}}
        elif command['command'] == 'get_world':
            world_id = command.get('world_id', None)
            if world_id is None:
                return {'result' : 'error', 'error' : 'must specify world_id'}
            elif world_id == "sample":
                return {'result' : 'success', 'world_id' : world_id, 'world' : json_safe_world(sample_world)}
            elif world_id not in global_state_dict:
                return {'result' : 'error', 'error' : "world {} doesn't exist".format(world_id)}
            else:
                return {'result' : 'success', 'world_id' : world_id, 'world' : json_safe_world(global_state_dict[world_id])}
        elif command['command'] == 'delete_world':
            world_id = command.get('world_id', None)
            if world_id is None:
                return {'result' : 'error', 'error' : 'must specify world_id'}
            elif world_id not in global_state_dict:
                return {'result' : 'error', 'error' : "world {} doesn't exist".format(world_id)}
            else:
                global_lock.acquire()
                del global_state_dict[world_id]
                global_lock.release()
                return {'result' : 'success', 'world_id' : world_id, 'world' : None}
        else:
            return {'result' : 'error', 'error' : '???'}